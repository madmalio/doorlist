package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateCutListIncludesPanelThicknessAndGrouping(t *testing.T) {
	app := &App{}

	style := DoorStyle{
		ID:             "style-1",
		Name:           "Standard Shaker",
		StileWidth:     2,
		RailWidth:      2,
		TenonLength:    0.375,
		PanelThickness: 0.25,
		PanelGap:       0.125,
	}

	jobs := []Job{
		{
			ID:             "job-1",
			Name:           "Kitchen",
			DefaultOverlay: 0.5,
			Doors: []DoorEntry{
				{ID: "d1", Qty: 2, OpWidth: 15, OpHeight: 25, StyleID: "style-1"},
				{ID: "d2", Qty: 1, OpWidth: 15, OpHeight: 25, StyleID: "style-1"},
			},
		},
	}

	tempDir := t.TempDir()
	jobsPath := filepath.Join(tempDir, "jobs.json")
	stylesPath := filepath.Join(tempDir, "styles.json")

	jobsPayload, err := json.Marshal(jobs)
	if err != nil {
		t.Fatalf("marshal jobs: %v", err)
	}
	if err := os.WriteFile(jobsPath, jobsPayload, 0o644); err != nil {
		t.Fatalf("write jobs: %v", err)
	}

	stylesPayload, err := json.Marshal([]DoorStyle{style})
	if err != nil {
		t.Fatalf("marshal styles: %v", err)
	}
	if err := os.WriteFile(stylesPath, stylesPayload, 0o644); err != nil {
		t.Fatalf("write styles: %v", err)
	}

	app.jobsPath = jobsPath
	app.stylesPath = stylesPath

	resp, err := app.GenerateCutList("job-1")
	if err != nil {
		t.Fatalf("GenerateCutList() error = %v", err)
	}

	if resp.JobID != "job-1" {
		t.Fatalf("expected job id job-1, got %s", resp.JobID)
	}

	var stile, rail, panel *CutListItem
	for i := range resp.Items {
		item := &resp.Items[i]
		switch item.Part {
		case "Stile":
			stile = item
		case "Rail":
			rail = item
		case "Panel":
			panel = item
		}
	}

	if stile == nil || rail == nil || panel == nil {
		t.Fatalf("expected stile, rail, and panel parts in cut list")
	}

	if stile.Qty != 6 {
		t.Fatalf("expected stile qty 6, got %d", stile.Qty)
	}
	if rail.Qty != 6 {
		t.Fatalf("expected rail qty 6, got %d", rail.Qty)
	}
	if panel.Qty != 3 {
		t.Fatalf("expected panel qty 3, got %d", panel.Qty)
	}

	if panel.ThicknessFormatted != "1/4" {
		t.Fatalf("expected panel thickness 1/4, got %s", panel.ThicknessFormatted)
	}

	if stile.WidthFormatted != "2" {
		t.Fatalf("expected stile width 2, got %s", stile.WidthFormatted)
	}
	if rail.WidthFormatted != "2" {
		t.Fatalf("expected rail width 2, got %s", rail.WidthFormatted)
	}
	if stile.ThicknessFormatted != "3/4" || rail.ThicknessFormatted != "3/4" {
		t.Fatalf("expected frame thickness 3/4, got stile=%s rail=%s", stile.ThicknessFormatted, rail.ThicknessFormatted)
	}
}

func TestGenerateCutListButtQtyMeansOpeningCount(t *testing.T) {
	app := &App{}

	style := DoorStyle{
		ID:             "style-1",
		Name:           "Standard Shaker",
		StileWidth:     2,
		RailWidth:      2,
		TenonLength:    0.375,
		PanelThickness: 0.25,
		PanelGap:       0.125,
	}

	jobs := []Job{
		{
			ID:             "job-1",
			Name:           "Kitchen",
			DefaultOverlay: 1.25,
			Doors: []DoorEntry{
				{ID: "d1", Qty: 3, OpWidth: 20, OpHeight: 30, StyleID: "style-1", DoorType: "butt", ButtGap: 0.125},
			},
		},
	}

	setupFiles(t, app, jobs, []DoorStyle{style})

	resp, err := app.GenerateCutList("job-1")
	if err != nil {
		t.Fatalf("GenerateCutList() error = %v", err)
	}

	parts := map[string]CutListItem{}
	for _, item := range resp.Items {
		parts[item.Part] = item
	}

	if got := parts["Stile"].Qty; got != 12 {
		t.Fatalf("expected stile qty 12 for 3 butt openings, got %d", got)
	}
	if got := parts["Rail"].Qty; got != 12 {
		t.Fatalf("expected rail qty 12 for 3 butt openings, got %d", got)
	}
	if got := parts["Panel"].Qty; got != 6 {
		t.Fatalf("expected panel qty 6 for 3 butt openings, got %d", got)
	}
}

func TestGenerateCutListButtCustomSideOverlaySplitsLeafWidths(t *testing.T) {
	app := &App{}

	style := DoorStyle{
		ID:             "style-1",
		Name:           "Standard Shaker",
		StileWidth:     2,
		RailWidth:      2,
		TenonLength:    0.375,
		PanelThickness: 0.25,
		PanelGap:       0.125,
	}

	jobs := []Job{
		{
			ID:             "job-1",
			Name:           "Kitchen",
			DefaultOverlay: 0.5,
			Doors: []DoorEntry{
				{
					ID:               "d1",
					Qty:              1,
					OpWidth:          20,
					OpHeight:         30,
					StyleID:          "style-1",
					DoorType:         "butt",
					ButtGap:          0.125,
					UseCustomOverlay: true,
					OverlayLeft:      0.5,
					OverlayRight:     1.25,
					OverlayTop:       0.5,
					OverlayBottom:    0.5,
				},
			},
		},
	}

	setupFiles(t, app, jobs, []DoorStyle{style})

	resp, err := app.GenerateCutList("job-1")
	if err != nil {
		t.Fatalf("GenerateCutList() error = %v", err)
	}

	railQtyByLength := map[string]int{}
	for _, item := range resp.Items {
		if item.Part == "Rail" {
			railQtyByLength[item.LengthFormatted] = item.Qty
		}
	}

	if len(railQtyByLength) != 2 {
		t.Fatalf("expected two distinct rail lengths for asymmetric butt overlays, got %d", len(railQtyByLength))
	}

	for _, qty := range railQtyByLength {
		if qty != 2 {
			t.Fatalf("expected each distinct rail length to have qty 2, got %d", qty)
		}
	}
}

func TestGenerateCutListSlabOnlyOutputsFinishedSizes(t *testing.T) {
	app := &App{}

	slabStyle := DoorStyle{
		ID:     "slab-style",
		Name:   "Slab",
		IsSlab: true,
	}

	jobs := []Job{
		{
			ID:             "job-1",
			Name:           "Kitchen",
			DefaultOverlay: 0.5,
			Doors: []DoorEntry{
				{ID: "d1", Qty: 2, OpWidth: 20, OpHeight: 30, StyleID: "slab-style", CustomOverlay: 0.5},
			},
		},
	}

	setupFiles(t, app, jobs, []DoorStyle{slabStyle})

	resp, err := app.GenerateCutList("job-1")
	if err != nil {
		t.Fatalf("GenerateCutList() error = %v", err)
	}

	if len(resp.Items) != 1 {
		t.Fatalf("expected only one slab item, got %d", len(resp.Items))
	}

	item := resp.Items[0]
	if item.Part != "Slab" {
		t.Fatalf("expected slab part, got %s", item.Part)
	}
	if item.Qty != 2 {
		t.Fatalf("expected slab qty 2, got %d", item.Qty)
	}
	if item.LengthFormatted != "31" || item.WidthFormatted != "21" {
		t.Fatalf("expected slab finished size 31 x 21, got %s x %s", item.LengthFormatted, item.WidthFormatted)
	}
}

func TestGenerateCutListUsesSelectedOverlayItemSides(t *testing.T) {
	app := &App{}

	style := DoorStyle{
		ID:             "style-1",
		Name:           "Standard Shaker",
		StileWidth:     2,
		RailWidth:      2,
		TenonLength:    0.375,
		PanelThickness: 0.25,
		PanelGap:       0.125,
	}

	jobs := []Job{
		{
			ID:             "job-1",
			Name:           "Kitchen",
			DefaultOverlay: 0.5,
			Doors: []DoorEntry{
				{
					ID:                   "d1",
					Qty:                  1,
					OpWidth:              20,
					OpHeight:             30,
					StyleID:              "style-1",
					OverlaySubcategoryID: "drawer-front-item",
					OverlayLeft:          0,
					OverlayRight:         1,
					OverlayTop:           0,
					OverlayBottom:        0,
				},
			},
		},
	}

	setupFiles(t, app, jobs, []DoorStyle{style})

	resp, err := app.GenerateCutList("job-1")
	if err != nil {
		t.Fatalf("GenerateCutList() error = %v", err)
	}

	var stile *CutListItem
	for i := range resp.Items {
		item := &resp.Items[i]
		if item.Part == "Stile" {
			stile = item
			break
		}
	}

	if stile == nil {
		t.Fatalf("expected stile part in cut list")
	}

	if stile.LengthFormatted != "30" {
		t.Fatalf("expected selected item side overlays to drive finished height 30, got %s", stile.LengthFormatted)
	}
}

func setupFiles(t *testing.T, app *App, jobs []Job, styles []DoorStyle) {
	t.Helper()

	tempDir := t.TempDir()
	jobsPath := filepath.Join(tempDir, "jobs.json")
	stylesPath := filepath.Join(tempDir, "styles.json")

	jobsPayload, err := json.Marshal(jobs)
	if err != nil {
		t.Fatalf("marshal jobs: %v", err)
	}
	if err := os.WriteFile(jobsPath, jobsPayload, 0o644); err != nil {
		t.Fatalf("write jobs: %v", err)
	}

	stylesPayload, err := json.Marshal(styles)
	if err != nil {
		t.Fatalf("marshal styles: %v", err)
	}
	if err := os.WriteFile(stylesPath, stylesPayload, 0o644); err != nil {
		t.Fatalf("write styles: %v", err)
	}

	app.jobsPath = jobsPath
	app.stylesPath = stylesPath
}
