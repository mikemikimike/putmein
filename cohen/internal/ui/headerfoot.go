package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// RenderHeader renders the sticky top bar.
func RenderHeader(width int, sessionName string, msgCount int) string {
	brand := HeaderBrandStyle.Render("⬡ cohen") +
		HeaderDimStyle.Render("  v0.2")

	middle := HeaderDimStyle.Render("session: ") +
		HeaderSessionStyle.Render(sessionName) +
		HeaderDimStyle.Render(fmt.Sprintf("  ·  %d msg%s", msgCount, plural(msgCount)))

	shortcuts := HeaderDimStyle.Render("/help · /sessions · /new")

	brandW := lipgloss.Width(brand)
	middleW := lipgloss.Width(middle)
	shortW := lipgloss.Width(shortcuts)
	innerW := width - 4
	if innerW < 1 {
		innerW = 1
	}
	gap1 := innerW - brandW - middleW - shortW
	if gap1 < 0 {
		gap1 = 0
	}
	left := gap1 / 2
	right := gap1 - left

	content := brand +
		strings.Repeat(" ", left) +
		middle +
		strings.Repeat(" ", right) +
		shortcuts

	return HeaderStyle.Width(width).Render(content)
}

func plural(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

// renderInputLine renders the query string with a block cursor at cursorPos.
// Characters before the cursor are rendered normally, the cursor character
// (or a block if at end) is highlighted, and characters after are rendered normally.
func renderInputLine(query string, cursorPos int, loading bool, modelName string) string {
	if strings.Contains(query, "\n") {
		lines := strings.Split(query, "\n")
		firstLine := lines[0]
		if len(firstLine) > 40 {
			firstLine = firstLine[:37] + "..."
		}
		return FooterInputStyle.Render(fmt.Sprintf("[Pasted %d lines] %s", len(lines), firstLine)) + FooterCursorStyle.Render("█")
	}

	runes := []rune(query)
	n := len(runes)

	// Clamp cursorPos
	if cursorPos < 0 {
		cursorPos = 0
	}
	if cursorPos > n {
		cursorPos = n
	}

	if loading {
		// Dim everything while loading
		return FooterInputStyle.Render(query) + FooterCursorStyle.Render("█")
	}

	var sb strings.Builder

	// Before cursor
	if cursorPos > 0 {
		sb.WriteString(FooterInputStyle.Render(string(runes[:cursorPos])))
	}

	// Cursor itself
	if cursorPos < n {
		// Highlight the character under the cursor
		sb.WriteString(lipgloss.NewStyle().
			Background(ColorCyan).
			Foreground(ColorBlack).
			Render(string(runes[cursorPos])))
	} else {
		if n == 0 {
			// Empty field: block then placeholder
			sb.WriteString(FooterCursorStyle.Render("█"))
			sb.WriteString(FooterHintStyle.Copy().PaddingLeft(0).Render(fmt.Sprintf(" Ask %s something…", modelName)))
		} else {
			sb.WriteString(FooterCursorStyle.Render("█"))
		}
	}

	// After cursor
	if cursorPos < n-1 {
		sb.WriteString(FooterInputStyle.Render(string(runes[cursorPos+1:])))
	}

	return sb.String()
}

// RenderFooter renders the sticky bottom input bar.
func RenderFooter(width int, query string, cursorPos int, loading bool, modelName string, autocompleteOpts []string, autocompleteCursor int) string {
	innerW := width - 6
	if innerW < 4 {
		innerW = 4
	}

	inputLine := renderInputLine(query, cursorPos, loading, modelName)

	var promptStr string
	if loading {
		promptStr = FooterPromptLoadingStyle.Render("❯ ")
		line := promptStr + FooterHintStyle.Copy().PaddingLeft(0).Render(fmt.Sprintf("%s is working… (Press esc to interrupt)", modelName))
		box := FooterBoxLoadingStyle.Width(innerW).Render(line)
		hint := FooterHintStyle.Render("/help · /model · /sessions · /new · /exit")
		return "\n" + box + "\n" + hint
	}

	promptStr = FooterPromptStyle.Render("❯ ")
	line := promptStr + inputLine
	box := FooterBoxStyle.Width(innerW).
		PaddingTop(1).
		PaddingBottom(1).
		Render(line)

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

	hint := FooterHintStyle.Render("↑↓ scroll  ←→ cursor  /help · /sessions · /new")
	return "\n" + acBox + box + "\n" + hint
}
