package ui

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"putdev/tui/internal/sessions"
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

// RenderMessage converts a Message to a styled string block for the viewport.
func RenderMessage(msg Message, width int) string {
	var parts []string

	// Thinking block (assistant only)
	if msg.Thinking != "" {
		parts = append(parts, ThinkingBoxStyle.Width(width-8).Render(
			lipgloss.NewStyle().Foreground(ColorGray).Italic(true).Render("Thought: "+msg.Thinking),
		)+"\n")
	}

	switch msg.Role {

	// ── User message ──────────────────────────────────────────────────────────
	// Right-aligned bubble with a cyan left-border accent and padding.
	// No full-width background fill — only the text box itself is styled.
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
			Width(width).
			Render(text)

		// 2 blank lines before + 1 after for breathing room
		parts = append(parts, "\n\n"+bubble+"\n")

	// ── Assistant message ─────────────────────────────────────────────────────
	// Left-aligned, plain white text. Bottom line shows "ozias · HH:MM".
	case RoleAssistant:
		body := renderFormattedText(msg.Content)
		styledBody := lipgloss.NewStyle().
			Foreground(ColorWhite).
			Render(body)

		ts := formatTimestamp(msg.CreatedAt)
		labelText := "ozias"
		if ts != "" {
			labelText = "ozias  ·  " + ts
		}
		label := lipgloss.NewStyle().
			Foreground(ColorDimGray).
			Render(labelText)

		// 2 blank lines below assistant response to separate from next message
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

// RenderMessages renders all messages for the chat viewport content.
func RenderMessages(msgs []Message, width int) string {
	var sb strings.Builder
	for _, m := range msgs {
		sb.WriteString(RenderMessage(m, width))
	}
	return sb.String()
}
