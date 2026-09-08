package ui

import (
	"fmt"
	"strings"
	"time"

	"cohen/tui/internal/sessions"

	"github.com/charmbracelet/lipgloss"
)

// MsgRole mirrors the React TUI message roles.
type MsgRole string

const (
	RoleUser      MsgRole = "user"
	RoleAssistant MsgRole = "assistant"
	RoleTerminal  MsgRole = "terminal"
	RoleSystem    MsgRole = "system"
	RoleError     MsgRole = "error"
)

// Message is a single chat message.
type Message struct {
	ID        string
	Role      MsgRole
	Content   string
	Thinking  string
	CreatedAt time.Time // set when message is created; used for timestamp display
}

// FromSessionMessage converts a persisted SessionMessage to a ui.Message.
func FromSessionMessage(m sessions.SessionMessage) Message {
	ts, _ := time.Parse(time.RFC3339, m.Timestamp)
	if ts.IsZero() {
		ts = time.Now()
	}
	return Message{
		Role:      MsgRole(m.Role),
		Content:   m.Content,
		Thinking:  m.Thinking,
		CreatedAt: ts,
	}
}

// formatTimestamp returns a concise time string like "5:30 PM".
func formatTimestamp(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("3:04 PM")
}

// renderFormattedText applies XML-tag formatting used by the AI.
// Go's RE2 engine doesn't support backreferences, so we parse tags manually.
func renderFormattedText(text string) string {
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
			sb.WriteString(lipgloss.NewStyle().Foreground(ColorCyan).Render(content))
		case "green":
			sb.WriteString(lipgloss.NewStyle().Foreground(ColorGreen).Render(content))
		case "red":
			sb.WriteString(lipgloss.NewStyle().Foreground(ColorRed).Render(content))
		case "yellow":
			sb.WriteString(lipgloss.NewStyle().Foreground(ColorYellow).Render(content))
		default:
			sb.WriteString(content)
		}
	}
	return sb.String()
}

// renderMessage formats a single message based on its role.
func renderMessage(msg Message, width int, modelName string) string {
	var parts []string

	// Thinking block (assistant only)
	if msg.Thinking != "" {
		parts = append(parts, ThinkingBoxStyle.Width(width-8).Render(
			lipgloss.NewStyle().Foreground(ColorGray).Italic(true).Render("Thought: "+msg.Thinking),
		)+"\n")
	}

	switch msg.Role {

	// ── User message ──────────────────────────────────────────────────────────
	case RoleUser:
		text := lipgloss.NewStyle().
			Foreground(ColorBlack).
			Bold(true).
			Render("❯ " + msg.Content)

		bubble := lipgloss.NewStyle().
			Background(ColorCyan).
			Foreground(ColorBlack).
			PaddingLeft(2).
			PaddingRight(2).
			PaddingTop(1).
			PaddingBottom(1).
			MarginBottom(1).
			Width(width).
			Render(text)

		parts = append(parts, "\n\n"+bubble+"\n")

	// ── Assistant message ─────────────────────────────────────────────────────
	case RoleAssistant:
		body := renderFormattedText(msg.Content)
		styledBody := lipgloss.NewStyle().
			Foreground(ColorWhite).
			Render(body)

		ts := ""
		if !msg.CreatedAt.IsZero() {
			ts = msg.CreatedAt.Format("3:04 PM")
		}
		labelText := strings.ToLower(modelName)
		if ts != "" {
			labelText = labelText + "  ·  " + ts
		}
		label := lipgloss.NewStyle().
			Foreground(ColorDimGray).
			MarginTop(1).
			Render(labelText)

		parts = append(parts, styledBody+"\n"+label+"\n\n")

	// ── Terminal output ───────────────────────────────────────────────────────
	case RoleTerminal:
		label := lipgloss.NewStyle().
			Foreground(ColorDimGray).Bold(true).
			Render("$ output")
		output := lipgloss.NewStyle().
			Foreground(ColorGray).
			Render(msg.Content)
		box := lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(ColorGray).
			PaddingLeft(2).PaddingRight(2).
			Render(label + "\n" + output)
		parts = append(parts, box+"\n\n")

	// ── System notice ─────────────────────────────────────────────────────────
	case RoleSystem:
		parts = append(parts, lipgloss.NewStyle().
			Foreground(ColorYellow).
			Italic(true).
			Render("ℹ   "+msg.Content)+"\n\n")

	// ── Error ─────────────────────────────────────────────────────────────────
	case RoleError:
		parts = append(parts, lipgloss.NewStyle().
			Foreground(ColorRed).
			Render("✖ "+msg.Content)+"\n\n")
	}

	return fmt.Sprintf("%s", strings.Join(parts, ""))
}

// RenderMessages formats a list of chat messages for the viewport.
func RenderMessages(messages []Message, width int, modelName string) string {
	var sb strings.Builder
	for _, m := range messages {
		sb.WriteString(renderMessage(m, width, modelName))
	}
	return sb.String()
}
