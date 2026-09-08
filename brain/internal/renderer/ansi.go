package renderer

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Colour palette — matches cohen's styles.go exactly for visual consistency.
var (
	colorCyan    = lipgloss.Color("#00D9FF")
	colorGreen   = lipgloss.Color("#39FF14")
	colorYellow  = lipgloss.Color("#FFD60A")
	colorRed     = lipgloss.Color("#FF4444")
)

// RenderXMLTags applies lipgloss styling to AI-generated XML formatting tags.
// Tags supported: <bold>, <italic>, <cyan>, <green>, <red>, <yellow>
// This is the same renderer as cohen's renderFormattedText, now shared in brain.
func RenderXMLTags(text string) string {
	var sb strings.Builder
	i := 0
	for i < len(text) {
		lt := strings.IndexByte(text[i:], '<')
		if lt < 0 {
			sb.WriteString(text[i:])
			break
		}
		sb.WriteString(text[i : i+lt])
		i += lt

		gt := strings.IndexByte(text[i:], '>')
		if gt < 0 {
			sb.WriteString(text[i:])
			break
		}
		openTag := text[i+1 : i+gt]
		if strings.HasPrefix(openTag, "/") || strings.ContainsAny(openTag, " \t\n\r") {
			sb.WriteString(text[i : i+gt+1])
			i += gt + 1
			continue
		}
		closeTag := "</" + openTag + ">"
		afterOpen := i + gt + 1
		end := strings.Index(text[afterOpen:], closeTag)
		if end < 0 {
			sb.WriteString(text[i : i+gt+1])
			i += gt + 1
			continue
		}
		content := text[afterOpen : afterOpen+end]
		i = afterOpen + end + len(closeTag)

		tag := strings.ToLower(openTag)
		switch tag {
		case "bold":
			sb.WriteString(lipgloss.NewStyle().Bold(true).Render(content))
		case "italic":
			sb.WriteString(lipgloss.NewStyle().Italic(true).Render(content))
		case "cyan":
			sb.WriteString(lipgloss.NewStyle().Foreground(colorCyan).Render(content))
		case "green":
			sb.WriteString(lipgloss.NewStyle().Foreground(colorGreen).Render(content))
		case "red":
			sb.WriteString(lipgloss.NewStyle().Foreground(colorRed).Render(content))
		case "yellow":
			sb.WriteString(lipgloss.NewStyle().Foreground(colorYellow).Render(content))
		default:
			// Unknown tag: output content without styling
			sb.WriteString(content)
		}
	}
	return sb.String()
}
