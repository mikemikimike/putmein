package ui

import (
	"strings"

	"cohen/tui/internal/ai"

	"github.com/charmbracelet/lipgloss"
)

type ModelsModal struct {
	Cursor int
}

func (m *ModelsModal) MoveUp() {
	models := ai.GetModels()
	m.Cursor = (m.Cursor - 1 + len(models)) % len(models)
}

func (m *ModelsModal) MoveDown() {
	models := ai.GetModels()
	m.Cursor = (m.Cursor + 1) % len(models)
}

func (m *ModelsModal) SelectedModel() ai.ModelConfig {
	return ai.GetModels()[m.Cursor]
}

func RenderModelsModal(m ModelsModal, termW, termH int) string {
	models := ai.GetModels()
	w := termW * 40 / 100
	if w < 40 {
		w = 40
	}
	if w > termW-6 {
		w = termW - 6
	}
	h := len(models) + 4

	dimText := lipgloss.NewStyle().Foreground(ColorDimGray)
	whiteBold := lipgloss.NewStyle().Foreground(ColorWhite).Bold(true)
	orange := lipgloss.Color("#FF8C00")
	activeRow := lipgloss.NewStyle().Background(orange).Foreground(ColorBlack).Width(w - 4)

	titleLeft := whiteBold.Render("Select Model")
	hintRight := dimText.Render("esc")
	gap := (w - 4) - lipgloss.Width(titleLeft) - lipgloss.Width(hintRight)
	if gap < 1 {
		gap = 1
	}
	titleRow := "  " + titleLeft + strings.Repeat(" ", gap) + hintRight

	var rows []string
	for i, mod := range models {
		active := m.Cursor == i
		if active {
			rows = append(rows, activeRow.Render("  "+mod.Name+" ("+mod.ID+")"))
		} else {
			rows = append(rows, "  "+mod.Name+" "+dimText.Render("("+mod.ID+")"))
		}
	}

	content := titleRow + "\n\n" + strings.Join(rows, "\n")

	modal := lipgloss.NewStyle().
		Background(lipgloss.Color("#0a0a0a")).
		PaddingTop(1).PaddingBottom(1).
		Width(w).
		Height(h).
		Render(content)

	return modal
}

func (m *ModelsModal) RowAtY(clickY, termW, termH int) int {
	models := ai.GetModels()
	w := termW * 40 / 100
	if w < 40 {
		w = 40
	}
	if w > termW-6 {
		w = termW - 6
	}
	h := len(models) + 4

	topY := (termH - h) / 2
	if topY < 0 {
		topY = 0
	}
	firstRowY := topY + 2
	relY := clickY - firstRowY
	if relY < 0 || relY >= len(models) {
		return -1
	}
	return relY
}
