package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// PermissionPrompt is displayed above the input field when the AI wants to
// run a tool and autonomous mode is disabled.
type PermissionPrompt struct {
	// ToolName is the human-readable tool name, e.g. "Run Command"
	ToolName string
	// Args is the command / path the AI wants to use
	Args string
	// Cursor: 0 = Allow, 1 = Deny
	Cursor int
}

// RenderPermissionPrompt renders the permission prompt bar that sits just above
// the footer input box. It is NOT a full-screen overlay — it appears inline
// above the composer, like a floating banner.
func RenderPermissionPrompt(p PermissionPrompt, width int) string {
	innerW := width - 6
	if innerW < 40 {
		innerW = 40
	}

	// Title line
	title := lipgloss.NewStyle().
		Foreground(ColorYellow).
		Bold(true).
		Render("⚡ Permission Required — " + p.ToolName)

	// Args line (the command / path)
	argsStr := p.Args
	maxArgLen := innerW - 6
	if len(argsStr) > maxArgLen {
		argsStr = argsStr[:maxArgLen-3] + "…"
	}
	args := lipgloss.NewStyle().
		Foreground(ColorCyan).
		Render(argsStr)

	// Allow / Deny buttons
	allowStyle := lipgloss.NewStyle().Padding(0, 2)
	denyStyle := lipgloss.NewStyle().Padding(0, 2)

	if p.Cursor == 0 {
		allowStyle = allowStyle.
			Background(ColorGreen).
			Foreground(ColorBlack).
			Bold(true)
		denyStyle = denyStyle.
			Foreground(ColorGray)
	} else {
		allowStyle = allowStyle.
			Foreground(ColorGray)
		denyStyle = denyStyle.
			Background(lipgloss.Color("#FF4444")).
			Foreground(ColorWhite).
			Bold(true)
	}

	allow := allowStyle.Render("✓ Allow")
	deny := denyStyle.Render("✗ Deny")
	buttons := allow + "   " + deny

	hint := lipgloss.NewStyle().
		Foreground(ColorDimGray).
		Render("←→ choose   enter confirm   s settings")

	sep := strings.Repeat("─", innerW)
	sepStyled := lipgloss.NewStyle().Foreground(ColorYellow).Render(sep)

	content := fmt.Sprintf("%s\n%s\n%s\n%s\n%s",
		title, args, buttons, sepStyled, hint)

	box := lipgloss.NewStyle().
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(ColorYellow).
		PaddingLeft(2).
		PaddingRight(2).
		PaddingTop(1).
		PaddingBottom(1).
		MarginLeft(1).
		MarginRight(1).
		Width(innerW).
		Render(content)

	return "\n" + box + "\n"
}
