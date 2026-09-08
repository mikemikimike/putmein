package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ASCII art banner, same as the React TUI.
var asciiArt = []string{
	"▐██████ ▐██████ ▐██ ▐██ ▐██████ ▐██████",
	"▐██     ▐██ ▐██ ▐██ ▐██ ▐██     ▐██ ▐██",
	"▐██     ▐██ ▐██ ▐██████ ▐████   ▐██ ▐██",
	"▐██     ▐██ ▐██ ▐██ ▐██ ▐██     ▐██ ▐██",
	"▐██████ ▐██████ ▐██ ▐██ ▐██████ ▐██ ▐██",
	"",
}

// RenderWelcome returns the entire UI for the welcome screen.
func RenderWelcome(termW, termH int, query string, cursorPos int, modelName string, autocompleteOpts []string, autocompleteCursor int) string {
	bannerLines := strings.Join(asciiArt, "\n")
	subtitle := "\n" +
		WelcomeSubtitleStyle.Render(fmt.Sprintf("Running on %s  ·  Type ", modelName)) +
		WelcomeCyanStyle.Render("/help") +
		WelcomeSubtitleStyle.Render(" to get started")
	banner := WelcomeBannerStyle.Render(bannerLines + subtitle)

	// --- Input box ---
	inputW := termW * 70 / 100
	if inputW < 75 {
		inputW = 75
	}
	if inputW > termW-4 {
		inputW = termW - 4
	}

	inputLine := renderInputLine(query, cursorPos, false, modelName)
	inputContent := FooterPromptStyle.Render("❯ ") + inputLine

	var acBox string
	if len(autocompleteOpts) > 0 {
		var rows []string
		for i, opt := range autocompleteOpts {
			if i == autocompleteCursor {
				rows = append(rows, lipgloss.NewStyle().Background(ColorCyan).Foreground(ColorBlack).Render(" "+opt+" "))
			} else {
				rows = append(rows, " "+opt+" ")
			}
		}
		acContent := strings.Join(rows, "\n")
		acBox = lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(ColorCyan).
			Render(acContent)
		acBox = lipgloss.NewStyle().MarginLeft(2).Render(acBox) + "\n"
	}

	inputBox := WelcomeInputBoxStyle.Width(inputW - 4).Render(inputContent)
	hint := WelcomeHintStyle.Render("/help · /model · /sessions · /new · /exit")
	inputSection := lipgloss.JoinVertical(lipgloss.Left, acBox+inputBox, hint)

	// --- Vertical centering ---
	bannerH := lipgloss.Height(banner)
	inputH := lipgloss.Height(inputSection)
	gap := 2
	totalH := bannerH + gap + inputH
	paddingTop := (termH - totalH) / 2
	if paddingTop < 0 {
		paddingTop = 0
	}

	topPad := strings.Repeat("\n", paddingTop)
	gapStr := strings.Repeat("\n", gap)

	full := lipgloss.JoinVertical(lipgloss.Center, topPad+banner+gapStr+inputSection)
	return lipgloss.Place(termW, termH, lipgloss.Center, lipgloss.Top, full)
}
