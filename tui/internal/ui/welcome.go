package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ASCII art banner — same as the React TUI.
var asciiArt = []string{
	"██████╗ ██╗   ██╗████████╗██████╗ ███████╗██╗   ██╗",
	"██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██╔════╝██║   ██║",
	"██████╔╝██║   ██║   ██║   ██║  ██║█████╗  ██║   ██║",
	"██╔═══╝ ██║   ██║   ██║   ██║  ██║██╔══╝  ╚██╗ ██╔╝",
	"██║     ╚██████╔╝   ██║   ██████╔╝███████╗ ╚████╔╝ ",
	"╚═╝      ╚═════╝    ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝  ",
}

// RenderWelcome renders the centred welcome screen.
func RenderWelcome(termW, termH int, query string, cursorPos int) string {
	// --- Banner ---
	bannerLines := strings.Join(asciiArt, "\n")
	subtitle := "\n" +
		WelcomeSubtitleStyle.Render("DevOps is not a joke  ·  Powered by Ozias  ·  Type ") +
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

	inputLine := renderInputLine(query, cursorPos, false)
	inputContent := FooterPromptStyle.Render("❯ ") + inputLine

	inputBox := WelcomeInputBoxStyle.Width(inputW - 4).Render(inputContent)
	hint := WelcomeHintStyle.Render("/help · /sessions · /new · /exit")
	inputSection := lipgloss.JoinVertical(lipgloss.Left, inputBox, hint)

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
