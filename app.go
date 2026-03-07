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
	"github.com/wailsapp/wails/v2/pkg/runtime"
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

	dataDir := filepath.Join(configDir, "cutlogic")
	if mkErr := os.MkdirAll(dataDir, 0o755); mkErr != nil {
		dataDir = "."
	}

	if dataDir != "." {
		legacyDir := filepath.Join(configDir, "doorlist")
		_ = copyFileIfMissing(filepath.Join(dataDir, "jobs.json"), filepath.Join(legacyDir, "jobs.json"))
		_ = copyFileIfMissing(filepath.Join(dataDir, "styles.json"), filepath.Join(legacyDir, "styles.json"))
		_ = copyFileIfMissing(filepath.Join(dataDir, "settings.json"), filepath.Join(legacyDir, "settings.json"))
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
		payload, _ := json.MarshalIndent(AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories()}, "", "  ")
		payload = append(payload, '\n')
		_ = os.WriteFile(a.settingsPath, payload, 0o644)
	}

	a.mu.Lock()
	_ = a.seedDefaultSlabStyleOnceUnsafe()
	a.mu.Unlock()
}

func copyFileIfMissing(dstPath, srcPath string) error {
	if _, err := os.Stat(dstPath); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	payload, err := os.ReadFile(srcPath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}

	return os.WriteFile(dstPath, payload, 0o644)
}

type Job struct {
	ID                       string      `json:"id"`
	CustomerName             string      `json:"customerName"`
	Name                     string      `json:"name"`
	ProductionStatus         string      `json:"productionStatus"`
	DefaultStyleID           string      `json:"defaultStyleId"`
	DefaultOverlayCategoryID string      `json:"defaultOverlayCategoryId"`
	DoorType                 string      `json:"doorType"`
	ButtGap                  float64     `json:"buttGap"`
	UseCustomOverlay         bool        `json:"useCustomOverlay"`
	OverlayLeft              float64     `json:"overlayLeft"`
	OverlayRight             float64     `json:"overlayRight"`
	OverlayTop               float64     `json:"overlayTop"`
	OverlayBottom            float64     `json:"overlayBottom"`
	DefaultOverlay           float64     `json:"defaultOverlay"`
	CreatedDate              time.Time   `json:"createdDate"`
	Doors                    []DoorEntry `json:"doors"`
}

type CreateJobRequest struct {
	CustomerName             string  `json:"customerName"`
	Project                  string  `json:"project"`
	ProductionStatus         string  `json:"productionStatus"`
	DefaultStyleID           string  `json:"defaultStyleId"`
	DefaultOverlayCategoryID string  `json:"defaultOverlayCategoryId"`
	DoorType                 string  `json:"doorType"`
	ButtGap                  float64 `json:"buttGap"`
	UseCustomOverlay         bool    `json:"useCustomOverlay"`
	OverlayLeft              float64 `json:"overlayLeft"`
	OverlayRight             float64 `json:"overlayRight"`
	OverlayTop               float64 `json:"overlayTop"`
	OverlayBottom            float64 `json:"overlayBottom"`
	DefaultOverlay           float64 `json:"defaultOverlay"`
}

type UpdateJobRequest struct {
	CustomerName             string  `json:"customerName"`
	Project                  string  `json:"project"`
	ProductionStatus         string  `json:"productionStatus"`
	DefaultStyleID           string  `json:"defaultStyleId"`
	DefaultOverlayCategoryID string  `json:"defaultOverlayCategoryId"`
	DoorType                 string  `json:"doorType"`
	ButtGap                  float64 `json:"buttGap"`
	UseCustomOverlay         bool    `json:"useCustomOverlay"`
	OverlayLeft              float64 `json:"overlayLeft"`
	OverlayRight             float64 `json:"overlayRight"`
	OverlayTop               float64 `json:"overlayTop"`
	OverlayBottom            float64 `json:"overlayBottom"`
	DefaultOverlay           float64 `json:"defaultOverlay"`
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
	Theme             string            `json:"theme"`
	OverlayCategories []OverlayCategory `json:"overlayCategories"`
	OverlayPresets    []OverlayPreset   `json:"overlayPresets,omitempty"`
	SeededDefaultSlab bool              `json:"seededDefaultSlab,omitempty"`
}

type CatalogDataPayload struct {
	Version    int         `json:"version"`
	ExportedAt string      `json:"exportedAt,omitempty"`
	Styles     []DoorStyle `json:"styles"`
}

type OverlayDataPayload struct {
	Version           int               `json:"version"`
	ExportedAt        string            `json:"exportedAt,omitempty"`
	OverlayCategories []OverlayCategory `json:"overlayCategories"`
}

type AppBackupPayload struct {
	Version    int         `json:"version"`
	ExportedAt string      `json:"exportedAt,omitempty"`
	Settings   AppSettings `json:"settings"`
	Styles     []DoorStyle `json:"styles"`
	Jobs       []Job       `json:"jobs"`
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
	ID               string               `json:"id"`
	Name             string               `json:"name"`
	Items            []OverlaySubcategory `json:"items,omitempty"`
	DoorItems        []OverlaySubcategory `json:"doorItems,omitempty"`
	DrawerFrontItems []OverlaySubcategory `json:"drawerFrontItems,omitempty"`
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
	Family         string  `json:"family,omitempty"`
	Variant        string  `json:"variant,omitempty"`
	StyleUse       string  `json:"styleUse,omitempty"`
	IsSlab         bool    `json:"isSlab"`
	Order          int     `json:"order,omitempty"`
	StileWidth     float64 `json:"stileWidth"`
	RailWidth      float64 `json:"railWidth"`
	TenonLength    float64 `json:"tenonLength"`
	PanelThickness float64 `json:"panelThickness"`
	PanelGap       float64 `json:"panelGap"`
}

type DoorStyleRequest struct {
	Name           string  `json:"name"`
	Family         string  `json:"family,omitempty"`
	Variant        string  `json:"variant,omitempty"`
	StyleUse       string  `json:"styleUse,omitempty"`
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
	PanelLayout          string  `json:"panelLayout"`
	SlabGrain            string  `json:"slabGrain"`
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
		ID:                       uuid.NewString(),
		CustomerName:             strings.TrimSpace(req.CustomerName),
		Name:                     strings.TrimSpace(req.Project),
		ProductionStatus:         normalizeProductionStatus(req.ProductionStatus),
		DefaultStyleID:           strings.TrimSpace(req.DefaultStyleID),
		DefaultOverlayCategoryID: strings.TrimSpace(req.DefaultOverlayCategoryID),
		DoorType:                 normalizeDoorType(req.DoorType),
		ButtGap:                  req.ButtGap,
		UseCustomOverlay:         req.UseCustomOverlay,
		OverlayLeft:              req.OverlayLeft,
		OverlayRight:             req.OverlayRight,
		OverlayTop:               req.OverlayTop,
		OverlayBottom:            req.OverlayBottom,
		DefaultOverlay:           req.DefaultOverlay,
		CreatedDate:              time.Now().UTC(),
		Doors:                    []DoorEntry{},
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
			jobs[i].ProductionStatus = normalizeProductionStatus(req.ProductionStatus)
			jobs[i].DefaultStyleID = strings.TrimSpace(req.DefaultStyleID)
			jobs[i].DefaultOverlayCategoryID = strings.TrimSpace(req.DefaultOverlayCategoryID)
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

	return normalizeOverlayCategoryList(settings.OverlayCategories), nil
}

func (a *App) SaveOverlayCategories(categories []OverlayCategory) ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	settings.OverlayCategories = normalizeOverlayCategoryList(categories)

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return nil, err
	}

	return settings.OverlayCategories, nil
}

func (a *App) ExportCatalogData() (CatalogDataPayload, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return CatalogDataPayload{}, err
	}

	styles = normalizeDoorStyleSliceForStorage(styles)

	return CatalogDataPayload{
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Styles:     styles,
	}, nil
}

func (a *App) ExportCatalogDataToFile() (string, error) {
	payload, err := a.ExportCatalogData()
	if err != nil {
		return "", err
	}

	dateText := time.Now().UTC().Format("2006-01-02")
	defaultName := fmt.Sprintf("cutlogic-catalog-%s.json", dateText)
	return a.saveJSONWithDialog("Export Catalog", defaultName, payload)
}

func (a *App) ImportCatalogData(payload CatalogDataPayload) ([]DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styles := normalizeDoorStyleSliceForStorage(payload.Styles)
	if err := a.saveDoorStylesUnsafe(styles); err != nil {
		return nil, err
	}

	if err := a.seedDefaultSlabStyleOnceUnsafe(); err != nil {
		return nil, err
	}

	return styles, nil
}

func (a *App) ExportOverlayData() (OverlayDataPayload, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return OverlayDataPayload{}, err
	}

	return OverlayDataPayload{
		Version:           1,
		ExportedAt:        time.Now().UTC().Format(time.RFC3339),
		OverlayCategories: normalizeOverlayCategoryList(settings.OverlayCategories),
	}, nil
}

func (a *App) ExportOverlayDataToFile() (string, error) {
	payload, err := a.ExportOverlayData()
	if err != nil {
		return "", err
	}

	dateText := time.Now().UTC().Format("2006-01-02")
	defaultName := fmt.Sprintf("cutlogic-overlay-presets-%s.json", dateText)
	return a.saveJSONWithDialog("Export Overlay Presets", defaultName, payload)
}

func (a *App) ImportOverlayData(payload OverlayDataPayload) ([]OverlayCategory, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return nil, err
	}

	settings.OverlayCategories = normalizeOverlayCategoryList(payload.OverlayCategories)
	if err := a.saveSettingsUnsafe(settings); err != nil {
		return nil, err
	}

	return settings.OverlayCategories, nil
}

func (a *App) ExportAllData() (AppBackupPayload, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings, err := a.loadSettingsUnsafe()
	if err != nil {
		return AppBackupPayload{}, err
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return AppBackupPayload{}, err
	}

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return AppBackupPayload{}, err
	}

	return AppBackupPayload{
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Settings:   settings,
		Styles:     normalizeDoorStyleSliceForStorage(styles),
		Jobs:       jobs,
	}, nil
}

func (a *App) ExportAllDataToFile() (string, error) {
	payload, err := a.ExportAllData()
	if err != nil {
		return "", err
	}

	dateText := time.Now().UTC().Format("2006-01-02")
	defaultName := fmt.Sprintf("cutlogic-backup-%s.json", dateText)
	return a.saveJSONWithDialog("Export Full Backup", defaultName, payload)
}

func (a *App) saveJSONWithDialog(title string, defaultName string, payload any) (string, error) {
	if a.ctx == nil {
		return "", errors.New("application context not ready")
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(filePath) == "" {
		return "", nil
	}

	contents, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return "", err
	}
	contents = append(contents, '\n')

	if err := os.WriteFile(filePath, contents, 0o644); err != nil {
		return "", err
	}

	return filePath, nil
}

func (a *App) ImportAllData(payload AppBackupPayload) (AppBackupPayload, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings := payload.Settings
	if strings.TrimSpace(settings.Theme) == "" {
		settings.Theme = "system"
	}
	settings.Theme = normalizeTheme(settings.Theme)
	settings.OverlayCategories = normalizeOverlayCategoryList(settings.OverlayCategories)

	styles := normalizeDoorStyleSliceForStorage(payload.Styles)

	jobs := make([]Job, 0, len(payload.Jobs))
	for _, job := range payload.Jobs {
		jobs = append(jobs, normalizeJobForStorage(job))
	}

	if err := a.saveSettingsUnsafe(settings); err != nil {
		return AppBackupPayload{}, err
	}
	if err := a.saveDoorStylesUnsafe(styles); err != nil {
		return AppBackupPayload{}, err
	}
	if err := a.saveJobsUnsafe(jobs); err != nil {
		return AppBackupPayload{}, err
	}

	if err := a.seedDefaultSlabStyleOnceUnsafe(); err != nil {
		return AppBackupPayload{}, err
	}

	updatedSettings, err := a.loadSettingsUnsafe()
	if err != nil {
		return AppBackupPayload{}, err
	}

	return AppBackupPayload{
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Settings:   updatedSettings,
		Styles:     styles,
		Jobs:       jobs,
	}, nil
}

func (a *App) WipeAllData() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	settings := AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories()}
	if err := a.saveSettingsUnsafe(settings); err != nil {
		return err
	}
	if err := a.saveJobsUnsafe([]Job{}); err != nil {
		return err
	}
	if err := a.saveDoorStylesUnsafe([]DoorStyle{}); err != nil {
		return err
	}

	return a.seedDefaultSlabStyleOnceUnsafe()
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

	sortDoorStyles(styles)

	return styles, nil
}

func (a *App) CreateDoorStyle(req DoorStyleRequest) (DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styleName, familyName, variantName := normalizeDoorStyleIdentity(req.Name, req.Family, req.Variant)
	if familyName == "" {
		return DoorStyle{}, errors.New("style family is required")
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return DoorStyle{}, err
	}

	style := DoorStyle{
		ID:             uuid.NewString(),
		Name:           styleName,
		Family:         familyName,
		Variant:        variantName,
		StyleUse:       normalizeStyleUse(req.StyleUse),
		IsSlab:         false,
		Order:          nextDoorStyleOrder(styles),
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

func (a *App) SaveDoorStyleOrder(styleIDs []string) ([]DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return nil, err
	}

	positionByID := make(map[string]int, len(styleIDs))
	position := 1
	for _, rawID := range styleIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			continue
		}
		if _, exists := positionByID[id]; exists {
			continue
		}
		positionByID[id] = position
		position += 1
	}

	nextPosition := position
	for i := range styles {
		if p, ok := positionByID[styles[i].ID]; ok {
			styles[i].Order = p
			continue
		}
		styles[i].Order = nextPosition
		nextPosition += 1
	}

	if err := a.saveDoorStylesUnsafe(styles); err != nil {
		return nil, err
	}

	sortDoorStyles(styles)
	return styles, nil
}

func (a *App) UpdateDoorStyle(id string, req DoorStyleRequest) (DoorStyle, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	styleName, familyName, variantName := normalizeDoorStyleIdentity(req.Name, req.Family, req.Variant)
	if familyName == "" {
		return DoorStyle{}, errors.New("style family is required")
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

			styles[i].Name = styleName
			styles[i].Family = familyName
			styles[i].Variant = variantName
			styles[i].StyleUse = normalizeStyleUse(req.StyleUse)
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
	job.ProductionStatus = normalizeProductionStatus(job.ProductionStatus)
	job.DefaultStyleID = strings.TrimSpace(job.DefaultStyleID)
	job.DefaultOverlayCategoryID = strings.TrimSpace(job.DefaultOverlayCategoryID)
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
		job.Doors[i].PanelLayout = normalizePanelLayout(job.Doors[i].PanelLayout)
		job.Doors[i].SlabGrain = normalizeSlabGrain(job.Doors[i].SlabGrain)
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

	updated := false
	for i := range jobs {
		normalizedStatus := normalizeProductionStatus(jobs[i].ProductionStatus)
		if jobs[i].ProductionStatus != normalizedStatus {
			jobs[i].ProductionStatus = normalizedStatus
			updated = true
		}

		for d := range jobs[i].Doors {
			normalizedOverlayType := normalizeOverlayType(jobs[i].Doors[d].OverlayType)
			if jobs[i].Doors[d].OverlayType != normalizedOverlayType {
				jobs[i].Doors[d].OverlayType = normalizedOverlayType
				updated = true
			}

			normalizedPanelLayout := normalizePanelLayout(jobs[i].Doors[d].PanelLayout)
			if jobs[i].Doors[d].PanelLayout != normalizedPanelLayout {
				jobs[i].Doors[d].PanelLayout = normalizedPanelLayout
				updated = true
			}

			normalizedSlabGrain := normalizeSlabGrain(jobs[i].Doors[d].SlabGrain)
			if jobs[i].Doors[d].SlabGrain != normalizedSlabGrain {
				jobs[i].Doors[d].SlabGrain = normalizedSlabGrain
				updated = true
			}
		}
	}

	if updated {
		if err := a.saveJobsUnsafe(jobs); err != nil {
			return nil, err
		}
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

	for i := range styles {
		styles[i].Name, styles[i].Family, styles[i].Variant = normalizeDoorStyleIdentity(styles[i].Name, styles[i].Family, styles[i].Variant)
		if styles[i].IsSlab || styles[i].ID == defaultSlabStyleID {
			styles[i].Name = "Slab"
			styles[i].Family = "Slab"
			styles[i].Variant = ""
		}
		if styles[i].Order <= 0 {
			styles[i].Order = i + 1
		}
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
		return AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories()}, nil
	}

	bytes, err := os.ReadFile(a.settingsPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return AppSettings{Theme: "system", OverlayCategories: defaultOverlayCategories()}, nil
		}
		return AppSettings{}, err
	}

	type settingsDisk struct {
		Theme                 string            `json:"theme"`
		OverlayCategories     []OverlayCategory `json:"overlayCategories"`
		DrawerFrontCategories []OverlayCategory `json:"drawerFrontCategories,omitempty"`
		OverlayPresets        []OverlayPreset   `json:"overlayPresets,omitempty"`
		SeededDefaultSlab     bool              `json:"seededDefaultSlab,omitempty"`
	}

	disk := settingsDisk{Theme: "system", OverlayCategories: defaultOverlayCategories()}
	if len(bytes) == 0 {
		return AppSettings{Theme: disk.Theme, OverlayCategories: disk.OverlayCategories, OverlayPresets: disk.OverlayPresets, SeededDefaultSlab: disk.SeededDefaultSlab}, nil
	}

	if err := json.Unmarshal(bytes, &disk); err != nil {
		return AppSettings{}, err
	}

	settings := AppSettings{
		Theme:             disk.Theme,
		OverlayCategories: disk.OverlayCategories,
		OverlayPresets:    disk.OverlayPresets,
		SeededDefaultSlab: disk.SeededDefaultSlab,
	}

	settings.Theme = normalizeTheme(settings.Theme)
	settings.OverlayCategories = normalizeOverlayCategoryList(settings.OverlayCategories)
	legacyDrawerCategories := normalizeOverlayCategoryList(disk.DrawerFrontCategories)
	if len(legacyDrawerCategories) > 0 {
		settings.OverlayCategories = mergeDrawerFrontIntoOverlayCategories(settings.OverlayCategories, legacyDrawerCategories)
	}

	if settings.OverlayCategories == nil {
		if len(settings.OverlayPresets) > 0 {
			settings.OverlayCategories = []OverlayCategory{
				{
					ID:        "legacy-import",
					Name:      "Imported",
					DoorItems: makeSubcategoriesFromPresets(settings.OverlayPresets),
				},
			}
		} else {
			settings.OverlayCategories = defaultOverlayCategories()
		}
	}

	return settings, nil
}

func (a *App) saveSettingsUnsafe(settings AppSettings) error {
	if a.settingsPath == "" {
		return errors.New("settings storage path is not initialized")
	}

	settings.OverlayCategories = normalizeOverlayCategoryList(settings.OverlayCategories)

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

func normalizeProductionStatus(status string) string {
	normalized := strings.ToLower(strings.TrimSpace(status))
	if normalized == "draft" || normalized == "in production" || normalized == "in finishing" || normalized == "complete" {
		return normalized
	}

	return "draft"
}

func normalizeOverlayType(overlayType string) string {
	normalized := strings.ToLower(strings.TrimSpace(overlayType))
	if normalized == "drawer-front" {
		return "drawer-front"
	}

	return "door"
}

func normalizePanelLayout(layout string) string {
	normalized := strings.ToLower(strings.TrimSpace(layout))
	if normalized == "two-panel-vertical" || normalized == "two-panel-horizontal" {
		return normalized
	}

	return "single"
}

func normalizeStyleUse(styleUse string) string {
	normalized := strings.ToLower(strings.TrimSpace(styleUse))
	if normalized == "door" || normalized == "drawer-front" {
		return normalized
	}

	return "both"
}

func normalizeSlabGrain(slabGrain string) string {
	normalized := strings.ToLower(strings.TrimSpace(slabGrain))
	if normalized == "vertical" || normalized == "horizontal" {
		return normalized
	}
	if normalized == "painted" || normalized == "mdf" {
		return "mdf"
	}

	return "mdf"
}

func normalizeDoorStyleIdentity(name string, family string, variant string) (string, string, string) {
	resolvedFamily := strings.TrimSpace(family)
	resolvedVariant := strings.TrimSpace(variant)
	resolvedName := strings.TrimSpace(name)

	if resolvedFamily == "" {
		resolvedFamily = resolvedName
	}
	if strings.EqualFold(resolvedFamily, "slab") {
		resolvedFamily = "Slab"
		resolvedVariant = ""
		if resolvedName == "" || strings.EqualFold(resolvedName, "slab") {
			resolvedName = "Slab"
		}
		return resolvedName, resolvedFamily, resolvedVariant
	}
	if resolvedVariant == "" {
		resolvedVariant = "Standard"
	}
	if resolvedName == "" {
		if strings.EqualFold(resolvedVariant, "Standard") {
			resolvedName = resolvedFamily
		} else {
			resolvedName = resolvedFamily + " - " + resolvedVariant
		}
	}

	return resolvedName, resolvedFamily, resolvedVariant
}

func normalizeDoorStyleSliceForStorage(styles []DoorStyle) []DoorStyle {
	normalized := make([]DoorStyle, 0, len(styles)+1)
	hasSlab := false
	slabCandidate := defaultSlabDoorStyle()

	for _, rawStyle := range styles {
		style := rawStyle
		style.Name, style.Family, style.Variant = normalizeDoorStyleIdentity(style.Name, style.Family, style.Variant)
		style.StyleUse = normalizeStyleUse(style.StyleUse)

		isSlab := style.ID == defaultSlabStyleID || style.IsSlab || strings.EqualFold(style.Family, "slab") || strings.EqualFold(style.Name, "slab")
		if isSlab {
			if !hasSlab {
				hasSlab = true
				slabCandidate = defaultSlabDoorStyle()
				if style.PanelThickness > 0 {
					slabCandidate.PanelThickness = style.PanelThickness
				}
				if style.Order > 0 {
					slabCandidate.Order = style.Order
				}
			}
			continue
		}

		style.IsSlab = false
		if strings.TrimSpace(style.ID) == "" {
			style.ID = uuid.NewString()
		}
		normalized = append(normalized, style)
	}

	if !hasSlab {
		slabCandidate = defaultSlabDoorStyle()
	}

	normalized = append(normalized, slabCandidate)
	sortDoorStyles(normalized)
	for i := range normalized {
		normalized[i].Order = i + 1
	}

	return normalized
}

func normalizeJobForStorage(job Job) Job {
	if strings.TrimSpace(job.ID) == "" {
		job.ID = uuid.NewString()
	}

	job.CustomerName = strings.TrimSpace(job.CustomerName)
	job.Name = strings.TrimSpace(job.Name)
	job.ProductionStatus = normalizeProductionStatus(job.ProductionStatus)
	job.DefaultStyleID = strings.TrimSpace(job.DefaultStyleID)
	job.DefaultOverlayCategoryID = strings.TrimSpace(job.DefaultOverlayCategoryID)
	job.DoorType = normalizeDoorType(job.DoorType)
	if job.ButtGap <= 0 {
		job.ButtGap = 0.125
	}
	if job.CreatedDate.IsZero() {
		job.CreatedDate = time.Now().UTC()
	}

	for i := range job.Doors {
		if strings.TrimSpace(job.Doors[i].ID) == "" {
			job.Doors[i].ID = uuid.NewString()
		}
		job.Doors[i].Name = strings.TrimSpace(job.Doors[i].Name)
		job.Doors[i].DoorType = normalizeDoorType(job.Doors[i].DoorType)
		job.Doors[i].OverlayType = normalizeOverlayType(job.Doors[i].OverlayType)
		job.Doors[i].PanelLayout = normalizePanelLayout(job.Doors[i].PanelLayout)
		job.Doors[i].SlabGrain = normalizeSlabGrain(job.Doors[i].SlabGrain)
		if job.Doors[i].ButtGap <= 0 {
			job.Doors[i].ButtGap = 0.125
		}
	}

	return job
}

func nextDoorStyleOrder(styles []DoorStyle) int {
	maxOrder := 0
	for _, style := range styles {
		if style.Order > maxOrder {
			maxOrder = style.Order
		}
	}

	return maxOrder + 1
}

func sortDoorStyles(styles []DoorStyle) {
	sort.SliceStable(styles, func(i, j int) bool {
		leftHasOrder := styles[i].Order > 0
		rightHasOrder := styles[j].Order > 0
		if leftHasOrder && rightHasOrder && styles[i].Order != styles[j].Order {
			return styles[i].Order < styles[j].Order
		}
		if leftHasOrder != rightHasOrder {
			return leftHasOrder
		}

		leftFamily := strings.ToLower(strings.TrimSpace(styles[i].Family))
		rightFamily := strings.ToLower(strings.TrimSpace(styles[j].Family))
		if leftFamily != rightFamily {
			return leftFamily < rightFamily
		}

		leftVariant := strings.ToLower(strings.TrimSpace(styles[i].Variant))
		rightVariant := strings.ToLower(strings.TrimSpace(styles[j].Variant))
		if leftVariant != rightVariant {
			return leftVariant < rightVariant
		}

		leftName := strings.ToLower(strings.TrimSpace(styles[i].Name))
		rightName := strings.ToLower(strings.TrimSpace(styles[j].Name))
		if leftName != rightName {
			return leftName < rightName
		}

		return styles[i].ID < styles[j].ID
	})
}

func normalizeOverlaySubcategories(items []OverlaySubcategory) []OverlaySubcategory {
	normalized := make([]OverlaySubcategory, 0, len(items))
	for _, item := range items {
		name := strings.TrimSpace(item.Name)
		if name == "" {
			continue
		}

		itemID := strings.TrimSpace(item.ID)
		if itemID == "" {
			itemID = uuid.NewString()
		}

		normalized = append(normalized, OverlaySubcategory{
			ID:     itemID,
			Name:   name,
			Left:   item.Left,
			Right:  item.Right,
			Top:    item.Top,
			Bottom: item.Bottom,
		})
	}

	return normalized
}

func copyOverlaySubcategories(items []OverlaySubcategory) []OverlaySubcategory {
	if len(items) == 0 {
		return []OverlaySubcategory{}
	}

	copyItems := make([]OverlaySubcategory, len(items))
	copy(copyItems, items)
	return copyItems
}

func normalizeOverlayCategoryList(categories []OverlayCategory) []OverlayCategory {
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

		doorSource := category.DoorItems
		if len(doorSource) == 0 && len(category.Items) > 0 {
			doorSource = category.Items
		}

		normalized = append(normalized, OverlayCategory{
			ID:               categoryID,
			Name:             name,
			DoorItems:        normalizeOverlaySubcategories(doorSource),
			DrawerFrontItems: normalizeOverlaySubcategories(category.DrawerFrontItems),
		})
	}

	return normalized
}

func mergeDrawerFrontIntoOverlayCategories(overlayCategories []OverlayCategory, drawerCategories []OverlayCategory) []OverlayCategory {
	merged := normalizeOverlayCategoryList(overlayCategories)

	nameIndex := map[string]int{}
	for idx, category := range merged {
		nameKey := strings.ToLower(strings.TrimSpace(category.Name))
		if nameKey != "" {
			nameIndex[nameKey] = idx
		}
	}

	for _, rawDrawerCategory := range drawerCategories {
		drawerCategory := normalizeOverlayCategoryList([]OverlayCategory{rawDrawerCategory})
		if len(drawerCategory) == 0 {
			continue
		}

		normalized := drawerCategory[0]
		drawerItems := normalized.DrawerFrontItems
		if len(drawerItems) == 0 {
			drawerItems = normalized.DoorItems
		}

		nameKey := strings.ToLower(strings.TrimSpace(normalized.Name))
		if idx, exists := nameIndex[nameKey]; exists {
			merged[idx].DrawerFrontItems = copyOverlaySubcategories(drawerItems)
			continue
		}

		newCategory := OverlayCategory{
			ID:               normalized.ID,
			Name:             normalized.Name,
			DoorItems:        []OverlaySubcategory{},
			DrawerFrontItems: copyOverlaySubcategories(drawerItems),
		}
		merged = append(merged, newCategory)
		if nameKey != "" {
			nameIndex[nameKey] = len(merged) - 1
		}
	}

	return merged
}

func defaultOverlayPresets() []OverlayPreset {
	return []OverlayPreset{}
}

func defaultOverlayCategories() []OverlayCategory {
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
		Family:         "Slab",
		Variant:        "",
		StyleUse:       "both",
		IsSlab:         true,
		Order:          1,
		StileWidth:     0,
		RailWidth:      0,
		TenonLength:    0,
		PanelThickness: 0.75,
		PanelGap:       0,
	}
}
