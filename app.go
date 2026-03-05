package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// App struct
type App struct {
	ctx          context.Context
	jobsPath     string
	stylesPath   string
	settingsPath string
	mu           sync.Mutex
}

const defaultSlabStyleID = "default-slab-style"

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}

	dataDir := filepath.Join(configDir, "doorlist")
	if mkErr := os.MkdirAll(dataDir, 0o755); mkErr != nil {
		dataDir = "."
	}

	a.jobsPath = filepath.Join(dataDir, "jobs.json")
	if _, statErr := os.Stat(a.jobsPath); errors.Is(statErr, os.ErrNotExist) {
		_ = os.WriteFile(a.jobsPath, []byte("[]\n"), 0o644)
	}

	a.stylesPath = filepath.Join(dataDir, "styles.json")
	if _, statErr := os.Stat(a.stylesPath); errors.Is(statErr, os.ErrNotExist) {
		defaultStyles := []DoorStyle{defaultSlabDoorStyle()}
		payload, _ := json.MarshalIndent(defaultStyles, "", "  ")
		payload = append(payload, '\n')
		_ = os.WriteFile(a.stylesPath, payload, 0o644)
	}

	a.settingsPath = filepath.Join(dataDir, "settings.json")
	if _, statErr := os.Stat(a.settingsPath); errors.Is(statErr, os.ErrNotExist) {
		payload, _ := json.MarshalIndent(AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories(), DrawerFrontCategories: defaultDrawerFrontCategories()}, "", "  ")
		payload = append(payload, '\n')
		_ = os.WriteFile(a.settingsPath, payload, 0o644)
	}

	a.mu.Lock()
	_ = a.seedDefaultSlabStyleOnceUnsafe()
	a.mu.Unlock()
}

type Job struct {
	ID                           string      `json:"id"`
	CustomerName                 string      `json:"customerName"`
	Name                         string      `json:"name"`
	DefaultStyleID               string      `json:"defaultStyleId"`
	DefaultOverlayCategoryID     string      `json:"defaultOverlayCategoryId"`
	DefaultDrawerFrontCategoryID string      `json:"defaultDrawerFrontCategoryId"`
	DoorType                     string      `json:"doorType"`
	ButtGap                      float64     `json:"buttGap"`
	UseCustomOverlay             bool        `json:"useCustomOverlay"`
	OverlayLeft                  float64     `json:"overlayLeft"`
	OverlayRight                 float64     `json:"overlayRight"`
	OverlayTop                   float64     `json:"overlayTop"`
	OverlayBottom                float64     `json:"overlayBottom"`
	DefaultOverlay               float64     `json:"defaultOverlay"`
	CreatedDate                  time.Time   `json:"createdDate"`
	Doors                        []DoorEntry `json:"doors"`
}

type CreateJobRequest struct {
	CustomerName                 string  `json:"customerName"`
	Project                      string  `json:"project"`
	DefaultStyleID               string  `json:"defaultStyleId"`
	DefaultOverlayCategoryID     string  `json:"defaultOverlayCategoryId"`
	DefaultDrawerFrontCategoryID string  `json:"defaultDrawerFrontCategoryId"`
	DoorType                     string  `json:"doorType"`
	ButtGap                      float64 `json:"buttGap"`
	UseCustomOverlay             bool    `json:"useCustomOverlay"`
	OverlayLeft                  float64 `json:"overlayLeft"`
	OverlayRight                 float64 `json:"overlayRight"`
	OverlayTop                   float64 `json:"overlayTop"`
	OverlayBottom                float64 `json:"overlayBottom"`
	DefaultOverlay               float64 `json:"defaultOverlay"`
}

type UpdateJobRequest struct {
	CustomerName                 string  `json:"customerName"`
	Project                      string  `json:"project"`
	DefaultStyleID               string  `json:"defaultStyleId"`
	DefaultOverlayCategoryID     string  `json:"defaultOverlayCategoryId"`
	DefaultDrawerFrontCategoryID string  `json:"defaultDrawerFrontCategoryId"`
	DoorType                     string  `json:"doorType"`
	ButtGap                      float64 `json:"buttGap"`
	UseCustomOverlay             bool    `json:"useCustomOverlay"`
	OverlayLeft                  float64 `json:"overlayLeft"`
	OverlayRight                 float64 `json:"overlayRight"`
	OverlayTop                   float64 `json:"overlayTop"`
	OverlayBottom                float64 `json:"overlayBottom"`
	DefaultOverlay               float64 `json:"defaultOverlay"`
}

type JobPageRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Search   string `json:"search"`
}

type JobPageResponse struct {
	Items    []Job `json:"items"`
	Total    int   `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}

type AppSettings struct {
	Theme                 string            `json:"theme"`
	OverlayCategories     []OverlayCategory `json:"overlayCategories"`
	DrawerFrontCategories []OverlayCategory `json:"drawerFrontCategories"`
	OverlayPresets        []OverlayPreset   `json:"overlayPresets,omitempty"`
	SeededDefaultSlab     bool              `json:"seededDefaultSlab,omitempty"`
}

type OverlayPreset struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Left   float64 `json:"left"`
	Right  float64 `json:"right"`
	Top    float64 `json:"top"`
	Bottom float64 `json:"bottom"`
}

type OverlayCategory struct {
	ID    string               `json:"id"`
	Name  string               `json:"name"`
	Items []OverlaySubcategory `json:"items"`
}

type OverlaySubcategory struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Left   float64 `json:"left"`
	Right  float64 `json:"right"`
	Top    float64 `json:"top"`
	Bottom float64 `json:"bottom"`
}

type GlobalSearchResult struct {
	Type     string `json:"type"`
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Meta     string `json:"meta"`
}

type UpdateSettingsRequest struct {
	Theme string `json:"theme"`
}

type DoorStyle struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	IsSlab         bool    `json:"isSlab"`
	StileWidth     float64 `json:"stileWidth"`
	RailWidth      float64 `json:"railWidth"`
	TenonLength    float64 `json:"tenonLength"`
	PanelThickness float64 `json:"panelThickness"`
	PanelGap       float64 `json:"panelGap"`
}

type DoorStyleRequest struct {
	Name           string  `json:"name"`
	StileWidth     float64 `json:"stileWidth"`
	RailWidth      float64 `json:"railWidth"`
	TenonLength    float64 `json:"tenonLength"`
	PanelThickness float64 `json:"panelThickness"`
	PanelGap       float64 `json:"panelGap"`
}

type DoorEntry struct {
	ID                   string  `json:"id"`
	Name                 string  `json:"name"`
	Qty                  int     `json:"qty"`
	OpWidth              float64 `json:"opWidth"`
	OpHeight             float64 `json:"opHeight"`
	StyleID              string  `json:"styleId"`
	OverlayType          string  `json:"overlayType"`
	OverlaySubcategoryID string  `json:"overlaySubcategoryId"`
	CustomOverlay        float64 `json:"customOverlay"`
	DoorType             string  `json:"doorType"`
	ButtGap              float64 `json:"buttGap"`
	UseCustomOverlay     bool    `json:"useCustomOverlay"`
	OverlayLeft          float64 `json:"overlayLeft"`
	OverlayRight         float64 `json:"overlayRight"`
	OverlayTop           float64 `json:"overlayTop"`
	OverlayBottom        float64 `json:"overlayBottom"`
}

func (a *App) GetJob(id string) (Job, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return Job{}, err
	}

	for _, job := range jobs {
		if job.ID == id {
			return job, nil
		}
	}

	return Job{}, errors.New("job not found")
}

func (a *App) GetJobsPage(req JobPageRequest) (JobPageResponse, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return JobPageResponse{}, err
	}

	page := req.Page
	if page < 1 {
		page = 1
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	searchTerm := strings.ToLower(strings.TrimSpace(req.Search))
	filtered := make([]Job, 0, len(jobs))
	for _, job := range jobs {
		if searchTerm == "" {
			filtered = append(filtered, job)
			continue
		}

		haystack := strings.ToLower(job.CustomerName + " " + job.Name)
		if strings.Contains(haystack, searchTerm) {
			filtered = append(filtered, job)
		}
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedDate.After(filtered[j].CreatedDate)
	})

	total := len(filtered)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}

	end := start + pageSize
	if end > total {
		end = total
	}

	return JobPageResponse{
		Items:    filtered[start:end],
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (a *App) CreateJob(req CreateJobRequest) (Job, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if strings.TrimSpace(req.CustomerName) == "" {
		return Job{}, errors.New("customer name is required")
	}
	if strings.TrimSpace(req.Project) == "" {
		return Job{}, errors.New("project is required")
	}

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return Job{}, err
	}

	job := Job{
		ID:                           uuid.NewString(),
		CustomerName:                 strings.TrimSpace(req.CustomerName),
		Name:                         strings.TrimSpace(req.Project),
		DefaultStyleID:               strings.TrimSpace(req.DefaultStyleID),
		DefaultOverlayCategoryID:     strings.TrimSpace(req.DefaultOverlayCategoryID),
		DefaultDrawerFrontCategoryID: strings.TrimSpace(req.DefaultDrawerFrontCategoryID),
		DoorType:                     normalizeDoorType(req.DoorType),
		ButtGap:                      req.ButtGap,
		UseCustomOverlay:             req.UseCustomOverlay,
		OverlayLeft:                  req.OverlayLeft,
		OverlayRight:                 req.OverlayRight,
		OverlayTop:                   req.OverlayTop,
		OverlayBottom:                req.OverlayBottom,
		DefaultOverlay:               req.DefaultOverlay,
		CreatedDate:                  time.Now().UTC(),
		Doors:                        []DoorEntry{},
	}

	if job.ButtGap <= 0 {
		job.ButtGap = 0.125
	}

	jobs = append(jobs, job)
	if err := a.saveJobsUnsafe(jobs); err != nil {
		return Job{}, err
	}

	return job, nil
}

func (a *App) UpdateJob(id string, req UpdateJobRequest) (Job, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if strings.TrimSpace(req.CustomerName) == "" {
		return Job{}, errors.New("customer name is required")
	}
	if strings.TrimSpace(req.Project) == "" {
		return Job{}, errors.New("project is required")
	}

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return Job{}, err
	}

	for i := range jobs {
		if jobs[i].ID == id {
			jobs[i].CustomerName = strings.TrimSpace(req.CustomerName)
			jobs[i].Name = strings.TrimSpace(req.Project)
			jobs[i].DefaultStyleID = strings.TrimSpace(req.DefaultStyleID)
			jobs[i].DefaultOverlayCategoryID = strings.TrimSpace(req.DefaultOverlayCategoryID)
			jobs[i].DefaultDrawerFrontCategoryID = strings.TrimSpace(req.DefaultDrawerFrontCategoryID)
			jobs[i].DoorType = normalizeDoorType(req.DoorType)
			jobs[i].ButtGap = req.ButtGap
			if jobs[i].ButtGap <= 0 {
				jobs[i].ButtGap = 0.125
			}
			jobs[i].UseCustomOverlay = req.UseCustomOverlay
			jobs[i].OverlayLeft = req.OverlayLeft
			jobs[i].OverlayRight = req.OverlayRight
			jobs[i].OverlayTop = req.OverlayTop
			jobs[i].OverlayBottom = req.OverlayBottom
			jobs[i].DefaultOverlay = req.DefaultOverlay

			if err := a.saveJobsUnsafe(jobs); err != nil {
				return Job{}, err
			}

			return jobs[i], nil
		}
	}

	return Job{}, errors.New("job not found")
}

func (a *App) DeleteJob(id string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return err
	}

	filtered := make([]Job, 0, len(jobs))
	deleted := false
	for _, job := range jobs {
		if job.ID == id {
			deleted = true
			continue
		}
		filtered = append(filtered, job)
	}

	if !deleted {
		return errors.New("job not found")
	}

	return a.saveJobsUnsafe(filtered)
}

func (a *App) GetSettings() (AppSettings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	return a.loadSettingsUnsafe()
}

func (a *App) UpdateSettings(req UpdateSettingsRequest) (AppSettings, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return AppSettings{}, err
	}

	settings.Theme = normalizeTheme(req.Theme)

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return AppSettings{}, err
	}

	return settings, nil
}

func (a *App) GetOverlayPresets() ([]OverlayPreset, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	return settings.OverlayPresets, nil
}

func (a *App) SaveOverlayPresets(presets []OverlayPreset) ([]OverlayPreset, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	normalized := make([]OverlayPreset, 0, len(presets))
	for _, preset := range presets {
		name := strings.TrimSpace(preset.Name)
		if name == "" {
			continue
		}

		id := strings.TrimSpace(preset.ID)
		if id == "" {
			id = uuid.NewString()
		}

		normalized = append(normalized, OverlayPreset{
			ID:     id,
			Name:   name,
			Left:   preset.Left,
			Right:  preset.Right,
			Top:    preset.Top,
			Bottom: preset.Bottom,
		})
	}

	settings.OverlayPresets = normalized

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return nil, err
	}

	return settings.OverlayPresets, nil
}

func (a *App) GetOverlayCategories() ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	return settings.OverlayCategories, nil
}

func (a *App) SaveOverlayCategories(categories []OverlayCategory) ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	normalized := make([]OverlayCategory, 0, len(categories))
	for _, category := range categories {
		name := strings.TrimSpace(category.Name)
		if name == "" {
			continue
		}

		categoryID := strings.TrimSpace(category.ID)
		if categoryID == "" {
			categoryID = uuid.NewString()
		}

		items := make([]OverlaySubcategory, 0, len(category.Items))
		for _, item := range category.Items {
			itemName := strings.TrimSpace(item.Name)
			if itemName == "" {
				continue
			}

			itemID := strings.TrimSpace(item.ID)
			if itemID == "" {
				itemID = uuid.NewString()
			}

			items = append(items, OverlaySubcategory{
				ID:     itemID,
				Name:   itemName,
				Left:   item.Left,
				Right:  item.Right,
				Top:    item.Top,
				Bottom: item.Bottom,
			})
		}

		normalized = append(normalized, OverlayCategory{
			ID:    categoryID,
			Name:  name,
			Items: items,
		})
	}

	settings.OverlayCategories = normalized

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return nil, err
	}

	return settings.OverlayCategories, nil
}

func (a *App) GetDrawerFrontCategories() ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	return settings.DrawerFrontCategories, nil
}

func (a *App) SaveDrawerFrontCategories(categories []OverlayCategory) ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	normalized := make([]OverlayCategory, 0, len(categories))
	for _, category := range categories {
		name := strings.TrimSpace(category.Name)
		if name == "" {
			continue
		}

		categoryID := strings.TrimSpace(category.ID)
		if categoryID == "" {
			categoryID = uuid.NewString()
		}

		items := make([]OverlaySubcategory, 0, len(category.Items))
		for _, item := range category.Items {
			itemName := strings.TrimSpace(item.Name)
			if itemName == "" {
				continue
			}

			itemID := strings.TrimSpace(item.ID)
			if itemID == "" {
				itemID = uuid.NewString()
			}

			items = append(items, OverlaySubcategory{
				ID:     itemID,
				Name:   itemName,
				Left:   item.Left,
				Right:  item.Right,
				Top:    item.Top,
				Bottom: item.Bottom,
			})
		}

		normalized = append(normalized, OverlayCategory{
			ID:    categoryID,
			Name:  name,
			Items: items,
		})
	}

	settings.DrawerFrontCategories = normalized

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return nil, err
	}

	return settings.DrawerFrontCategories, nil
}

func (a *App) SearchGlobal(query string) ([]GlobalSearchResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return nil, err
	}

	trimmed := strings.ToLower(strings.TrimSpace(query))
	if trimmed == "" {
		return []GlobalSearchResult{}, nil
	}

	results := make([]GlobalSearchResult, 0)
	for _, job := range jobs {
		haystack := strings.ToLower(job.CustomerName + " " + job.Name)
		if !strings.Contains(haystack, trimmed) {
			continue
		}

		meta := strings.TrimSpace(job.CustomerName)
		if !job.CreatedDate.IsZero() {
			dateText := job.CreatedDate.Local().Format("01/02/2006")
			if meta == "" {
				meta = fmt.Sprintf("Created %s", dateText)
			} else {
				meta = fmt.Sprintf("%s | %s", meta, dateText)
			}
		}

		results = append(results, GlobalSearchResult{
			Type:     "job",
			ID:       job.ID,
			Title:    job.Name,
			Subtitle: "Job",
			Meta:     meta,
		})

		if len(results) >= 20 {
			break
		}
	}

	return results, nil
}

func (a *App) LoadDoorStyles() ([]DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return nil, err
	}

	sort.Slice(styles, func(i, j int) bool {
		return strings.ToLower(styles[i].Name) < strings.ToLower(styles[j].Name)
	})

	return styles, nil
}

func (a *App) CreateDoorStyle(req DoorStyleRequest) (DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if strings.TrimSpace(req.Name) == "" {
		return DoorStyle{}, errors.New("style name is required")
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return DoorStyle{}, err
	}

	style := DoorStyle{
		ID:             uuid.NewString(),
		Name:           strings.TrimSpace(req.Name),
		IsSlab:         false,
		StileWidth:     req.StileWidth,
		RailWidth:      req.RailWidth,
		TenonLength:    req.TenonLength,
		PanelThickness: req.PanelThickness,
		PanelGap:       req.PanelGap,
	}

	styles = append(styles, style)
	if err := a.saveDoorStylesUnsafe(styles); err != nil {
		return DoorStyle{}, err
	}

	return style, nil
}

func (a *App) UpdateDoorStyle(id string, req DoorStyleRequest) (DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if strings.TrimSpace(req.Name) == "" {
		return DoorStyle{}, errors.New("style name is required")
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return DoorStyle{}, err
	}

	for i := range styles {
		if styles[i].ID == id {
			if styles[i].ID == defaultSlabStyleID {
				return DoorStyle{}, errors.New("default slab style cannot be edited")
			}

			styles[i].Name = strings.TrimSpace(req.Name)
			styles[i].StileWidth = req.StileWidth
			styles[i].RailWidth = req.RailWidth
			styles[i].TenonLength = req.TenonLength
			styles[i].PanelThickness = req.PanelThickness
			styles[i].PanelGap = req.PanelGap

			if err := a.saveDoorStylesUnsafe(styles); err != nil {
				return DoorStyle{}, err
			}

			return styles[i], nil
		}
	}

	return DoorStyle{}, errors.New("door style not found")
}

func (a *App) DeleteDoorStyle(id string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return err
	}

	filtered := make([]DoorStyle, 0, len(styles))
	deleted := false
	for _, style := range styles {
		if style.ID == id {
			if style.ID == defaultSlabStyleID {
				return errors.New("default slab style cannot be deleted")
			}
			deleted = true
			continue
		}
		filtered = append(filtered, style)
	}

	if !deleted {
		return errors.New("door style not found")
	}

	return a.saveDoorStylesUnsafe(filtered)
}

func (a *App) SaveJob(job Job) (Job, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return Job{}, err
	}

	if job.ID == "" {
		job.ID = uuid.NewString()
	}
	job.CustomerName = strings.TrimSpace(job.CustomerName)
	job.Name = strings.TrimSpace(job.Name)
	job.DefaultStyleID = strings.TrimSpace(job.DefaultStyleID)
	job.DefaultOverlayCategoryID = strings.TrimSpace(job.DefaultOverlayCategoryID)
	job.DefaultDrawerFrontCategoryID = strings.TrimSpace(job.DefaultDrawerFrontCategoryID)
	job.DoorType = normalizeDoorType(job.DoorType)
	if job.ButtGap <= 0 {
		job.ButtGap = 0.125
	}
	if job.CreatedDate.IsZero() {
		job.CreatedDate = time.Now().UTC()
	}

	for i := range job.Doors {
		job.Doors[i].Name = strings.TrimSpace(job.Doors[i].Name)
		job.Doors[i].DoorType = normalizeDoorType(job.Doors[i].DoorType)
		job.Doors[i].OverlayType = normalizeOverlayType(job.Doors[i].OverlayType)
		if job.Doors[i].ButtGap <= 0 {
			job.Doors[i].ButtGap = 0.125
		}
	}

	updated := false
	for i := range jobs {
		if jobs[i].ID == job.ID {
			jobs[i] = job
			updated = true
			break
		}
	}
	if !updated {
		jobs = append(jobs, job)
	}

	if err := a.saveJobsUnsafe(jobs); err != nil {
		return Job{}, err
	}

	return job, nil
}

func (a *App) LoadJobs() ([]Job, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	return a.loadJobsUnsafe()
}

func (a *App) loadJobsUnsafe() ([]Job, error) {
	if a.jobsPath == "" {
		return []Job{}, nil
	}

	bytes, err := os.ReadFile(a.jobsPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Job{}, nil
		}
		return nil, err
	}

	jobs := []Job{}
	if len(bytes) == 0 {
		return jobs, nil
	}

	if err := json.Unmarshal(bytes, &jobs); err != nil {
		return nil, err
	}

	return jobs, nil
}

func (a *App) saveJobsUnsafe(jobs []Job) error {
	if a.jobsPath == "" {
		return errors.New("jobs storage path is not initialized")
	}

	payload, err := json.MarshalIndent(jobs, "", "  ")
	if err != nil {
		return err
	}

	payload = append(payload, '\n')
	return os.WriteFile(a.jobsPath, payload, 0o644)
}

func (a *App) loadDoorStylesUnsafe() ([]DoorStyle, error) {
	if a.stylesPath == "" {
		return []DoorStyle{}, nil
	}

	bytes, err := os.ReadFile(a.stylesPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []DoorStyle{}, nil
		}
		return nil, err
	}

	styles := []DoorStyle{}
	if len(bytes) == 0 {
		return styles, nil
	}

	if err := json.Unmarshal(bytes, &styles); err != nil {
		return nil, err
	}

	return styles, nil
}

func (a *App) saveDoorStylesUnsafe(styles []DoorStyle) error {
	if a.stylesPath == "" {
		return errors.New("styles storage path is not initialized")
	}

	payload, err := json.MarshalIndent(styles, "", "  ")
	if err != nil {
		return err
	}

	payload = append(payload, '\n')
	return os.WriteFile(a.stylesPath, payload, 0o644)
}

func (a *App) seedDefaultSlabStyleOnceUnsafe() error {
	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return err
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return err
	}

	hasSlab := false
	for i, style := range styles {
		if style.ID == defaultSlabStyleID {
			hasSlab = true
			styles[i] = defaultSlabDoorStyle()
			break
		}

		if style.IsSlab || strings.EqualFold(strings.TrimSpace(style.Name), "slab") {
			hasSlab = true
			break
		}
	}

	if !hasSlab {
		styles = append(styles, defaultSlabDoorStyle())
	}

	if err := a.saveDoorStylesUnsafe(styles); err != nil {
		return err
	}

	settings.SeededDefaultSlab = true
	return a.saveSettingsUnsafe(settings)
}

func (a *App) loadSettingsUnsafe() (AppSettings, error) {
	if a.settingsPath == "" {
		return AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories(), DrawerFrontCategories: defaultDrawerFrontCategories()}, nil
	}

	bytes, err := os.ReadFile(a.settingsPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories(), DrawerFrontCategories: defaultDrawerFrontCategories()}, nil
		}
		return AppSettings{}, err
	}

	settings := AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories(), DrawerFrontCategories: defaultDrawerFrontCategories()}
	if len(bytes) == 0 {
		return settings, nil
	}

	if err := json.Unmarshal(bytes, &settings); err != nil {
		return AppSettings{}, err
	}

	settings.Theme = normalizeTheme(settings.Theme)
	if settings.OverlayCategories == nil {
		if len(settings.OverlayPresets) > 0 {
			settings.OverlayCategories = []OverlayCategory{
				{
					ID:    "legacy-import",
					Name:  "Imported",
					Items: makeSubcategoriesFromPresets(settings.OverlayPresets),
				},
			}
		} else {
			settings.OverlayCategories = defaultOverlayCategories()
		}
	}
	if settings.DrawerFrontCategories == nil {
		settings.DrawerFrontCategories = defaultDrawerFrontCategories()
	}
	return settings, nil
}

func (a *App) saveSettingsUnsafe(settings AppSettings) error {
	if a.settingsPath == "" {
		return errors.New("settings storage path is not initialized")
	}

	payload, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	payload = append(payload, '\n')
	return os.WriteFile(a.settingsPath, payload, 0o644)
}

func normalizeTheme(theme string) string {
	normalized := strings.ToLower(strings.TrimSpace(theme))
	if normalized == "light" || normalized == "dark" || normalized == "system" {
		return normalized
	}

	return "system"
}

func normalizeDoorType(doorType string) string {
	normalized := strings.ToLower(strings.TrimSpace(doorType))
	if normalized == "butt" {
		return "butt"
	}

	return "single"
}

func normalizeOverlayType(overlayType string) string {
	normalized := strings.ToLower(strings.TrimSpace(overlayType))
	if normalized == "drawer-front" {
		return "drawer-front"
	}

	return "door"
}

func defaultOverlayPresets() []OverlayPreset {
	return []OverlayPreset{}
}

func defaultOverlayCategories() []OverlayCategory {
	return []OverlayCategory{}
}

func defaultDrawerFrontCategories() []OverlayCategory {
	return []OverlayCategory{}
}

func makeSubcategoriesFromPresets(presets []OverlayPreset) []OverlaySubcategory {
	items := make([]OverlaySubcategory, 0, len(presets))
	for _, preset := range presets {
		name := strings.TrimSpace(preset.Name)
		if name == "" {
			continue
		}

		id := strings.TrimSpace(preset.ID)
		if id == "" {
			id = uuid.NewString()
		}

		items = append(items, OverlaySubcategory{
			ID:     id,
			Name:   name,
			Left:   preset.Left,
			Right:  preset.Right,
			Top:    preset.Top,
			Bottom: preset.Bottom,
		})
	}

	return items
}

func defaultSlabDoorStyle() DoorStyle {
	return DoorStyle{
		ID:             defaultSlabStyleID,
		Name:           "Slab",
		IsSlab:         true,
		StileWidth:     0,
		RailWidth:      0,
		TenonLength:    0,
		PanelThickness: 0.75,
		PanelGap:       0,
	}
}
