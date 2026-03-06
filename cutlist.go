package main

import (
	"errors"
	"fmt"
	"math"
	"sort"
)

const frameThickness = 0.75

type CutListItem struct {
	Part               string  `json:"part"`
	Qty                int     `json:"qty"`
	Length             float64 `json:"length"`
	Width              float64 `json:"width"`
	Thickness          float64 `json:"thickness"`
	LengthFormatted    string  `json:"lengthFormatted"`
	WidthFormatted     string  `json:"widthFormatted"`
	ThicknessFormatted string  `json:"thicknessFormatted"`
	Label              string  `json:"label"`
}

type CutListResponse struct {
	JobID   string        `json:"jobId"`
	JobName string        `json:"jobName"`
	Items   []CutListItem `json:"items"`
}

func (a *App) GenerateCutList(jobID string) (CutListResponse, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	jobs, err := a.loadJobsUnsafe()
	if err != nil {
		return CutListResponse{}, err
	}

	styles, err := a.loadDoorStylesUnsafe()
	if err != nil {
		return CutListResponse{}, err
	}

	styleByID := make(map[string]DoorStyle, len(styles))
	for _, style := range styles {
		styleByID[style.ID] = style
	}

	var job *Job
	for i := range jobs {
		if jobs[i].ID == jobID {
			job = &jobs[i]
			break
		}
	}

	if job == nil {
		return CutListResponse{}, errors.New("job not found")
	}

	groups := map[string]CutListItem{}

	for _, door := range job.Doors {
		if door.Qty <= 0 {
			continue
		}

		doorType := normalizeDoorType(door.DoorType)
		if door.DoorType == "" {
			doorType = normalizeDoorType(job.DoorType)
		}

		overlayLeft, overlayRight, overlayTop, overlayBottom := resolveDoorOverlays(door, *job)
		finishedHeight := door.OpHeight + overlayTop + overlayBottom
		if finishedHeight <= 0 {
			continue
		}

		if doorType == "butt" {
			gap := door.ButtGap
			if gap <= 0 {
				gap = job.ButtGap
			}
			if gap <= 0 {
				gap = 0.125
			}

			totalFinishedWidth := door.OpWidth + overlayLeft + overlayRight
			clearPairWidth := totalFinishedWidth - gap
			if clearPairWidth <= 0 {
				continue
			}

			leafFinishedWidth := clearPairWidth / 2.0
			leafQty := door.Qty * 2

			style, ok := styleByID[door.StyleID]
			if !ok {
				return CutListResponse{}, fmt.Errorf("door style not found for door entry: %s", door.StyleID)
			}

			if style.IsSlab {
				addSlabParts(groups, leafQty, leafFinishedWidth, finishedHeight, style.PanelThickness)
				continue
			}

			addLeafParts(groups, style, leafQty, leafFinishedWidth, finishedHeight)
			continue
		}

		finishedWidth := door.OpWidth + overlayLeft + overlayRight
		style, ok := styleByID[door.StyleID]
		if !ok {
			return CutListResponse{}, fmt.Errorf("door style not found for door entry: %s", door.StyleID)
		}

		if style.IsSlab {
			addSlabParts(groups, door.Qty, finishedWidth, finishedHeight, style.PanelThickness)
			continue
		}

		addLeafParts(groups, style, door.Qty, finishedWidth, finishedHeight)
	}

	items := make([]CutListItem, 0, len(groups))
	for _, item := range groups {
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Part != items[j].Part {
			return items[i].Part < items[j].Part
		}
		if items[i].Length != items[j].Length {
			return items[i].Length < items[j].Length
		}
		if items[i].Width != items[j].Width {
			return items[i].Width < items[j].Width
		}
		return items[i].Thickness < items[j].Thickness
	})

	return CutListResponse{
		JobID:   job.ID,
		JobName: job.Name,
		Items:   items,
	}, nil
}

func addGroupedPart(groups map[string]CutListItem, part string, qty int, length float64, width float64, thickness float64) {
	normalizedLength := roundToThirtySecond(length)
	normalizedWidth := roundToThirtySecond(width)
	normalizedThickness := roundToThirtySecond(thickness)

	key := fmt.Sprintf("%s|%.5f|%.5f|%.5f", part, normalizedLength, normalizedWidth, normalizedThickness)
	current, exists := groups[key]
	if !exists {
		item := CutListItem{
			Part:               part,
			Qty:                qty,
			Length:             normalizedLength,
			Width:              normalizedWidth,
			Thickness:          normalizedThickness,
			LengthFormatted:    FormatFraction(normalizedLength),
			WidthFormatted:     FormatFraction(normalizedWidth),
			ThicknessFormatted: FormatFraction(normalizedThickness),
		}
		item.Label = buildCutLabel(item)
		groups[key] = item
		return
	}

	current.Qty += qty
	current.Label = buildCutLabel(current)
	groups[key] = current
}

func addLeafParts(groups map[string]CutListItem, style DoorStyle, openingQty int, finishedWidth float64, finishedHeight float64) {
	if finishedWidth <= 0 || finishedHeight <= 0 {
		return
	}

	stileLength := finishedHeight
	railLength := (finishedWidth - (style.StileWidth * 2)) + (style.TenonLength * 2)
	panelWidth := railLength - style.PanelGap
	panelHeight := (finishedHeight - (style.RailWidth * 2)) + (style.TenonLength * 2) - style.PanelGap

	if railLength <= 0 || panelWidth <= 0 || panelHeight <= 0 {
		return
	}

	addGroupedPart(groups, "Stile", openingQty*2, stileLength, style.StileWidth, frameThickness)
	addGroupedPart(groups, "Rail", openingQty*2, railLength, style.RailWidth, frameThickness)
	addGroupedPart(groups, "Panel", openingQty, panelHeight, panelWidth, style.PanelThickness)
}

func addSlabParts(groups map[string]CutListItem, openingQty int, finishedWidth float64, finishedHeight float64, thickness float64) {
	if finishedWidth <= 0 || finishedHeight <= 0 {
		return
	}

	if thickness <= 0 {
		thickness = frameThickness
	}

	addGroupedPart(groups, "Slab", openingQty, finishedHeight, finishedWidth, thickness)
}

func resolveDoorOverlays(door DoorEntry, job Job) (float64, float64, float64, float64) {
	if door.OverlaySubcategoryID != "" {
		return door.OverlayLeft, door.OverlayRight, door.OverlayTop, door.OverlayBottom
	}

	if door.UseCustomOverlay {
		return door.OverlayLeft, door.OverlayRight, door.OverlayTop, door.OverlayBottom
	}

	if door.CustomOverlay != 0 {
		return door.CustomOverlay, door.CustomOverlay, door.CustomOverlay, door.CustomOverlay
	}

	if job.UseCustomOverlay {
		return job.OverlayLeft, job.OverlayRight, job.OverlayTop, job.OverlayBottom
	}

	return job.DefaultOverlay, job.DefaultOverlay, job.DefaultOverlay, job.DefaultOverlay
}

func buildCutLabel(item CutListItem) string {
	if item.Part == "Slab" {
		if item.Width > 0 && item.Thickness > 0 {
			return fmt.Sprintf("%dx %s %s x %s x %s", item.Qty, item.Part, item.LengthFormatted, item.WidthFormatted, item.ThicknessFormatted)
		}

		if item.Width > 0 {
			return fmt.Sprintf("%dx %s %s x %s", item.Qty, item.Part, item.LengthFormatted, item.WidthFormatted)
		}

		return fmt.Sprintf("%dx %s %s", item.Qty, item.Part, item.LengthFormatted)
	}

	if item.Width > 0 && item.Thickness > 0 {
		return fmt.Sprintf("%dx %s - %s x %s x %s", item.Qty, item.Part, item.LengthFormatted, item.WidthFormatted, item.ThicknessFormatted)
	}

	if item.Width > 0 {
		return fmt.Sprintf("%dx %s - %s x %s", item.Qty, item.Part, item.LengthFormatted, item.WidthFormatted)
	}

	return fmt.Sprintf("%dx %s - %s", item.Qty, item.Part, item.LengthFormatted)
}

func roundToThirtySecond(value float64) float64 {
	return math.Round(value*32.0) / 32.0
}
