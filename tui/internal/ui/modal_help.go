package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// RenderHelpModal renders the help overlay as a centred modal.
func RenderHelpModal(termW, termH int) string {
	title := ModalTitleStyle.Render("Available Commands")
	divider := ModalDividerStyle.Render(strings.Repeat("─", 46))

	row := func(cmd, hint string) string {
		cmdPart := lipgloss.NewStyle().Foreground(ColorCyan).Render(cmd)
		pad := strings.Repeat(" ", 14-len(cmd))
		return cmdPart + pad + hint
	}

	rows := strings.Join([]string{
		row("/help", "Show this menu"),
		row("/sessions", "Browse & switch sessions"),
		row("/rename [name]", "Rename current session"),
		row("/new", "Start a fresh session"),
		row("/clear", "Wipe current session history"),
		row("/exit", "Exit PUTDEV"),
		"",
		ModalHintStyle.Render("Keyboard shortcuts:"),
		ModalHintStyle.Render("  ?        → toggle this menu"),
		ModalHintStyle.Render("  ↑ ↓      → scroll chat"),
		ModalHintStyle.Render("  PgUp/Dn  → scroll ×5"),
		ModalHintStyle.Render("  Esc      → close modal"),
	}, "\n")

	hint := ModalHintStyle.Render("esc · enter · q  to close")

	content := strings.Join([]string{title, divider, rows, divider, hint}, "\n")
	modal := ModalStyle.Render(content)

	return modal
}
