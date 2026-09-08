package ui

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// ── Settings modal state ──────────────────────────────────────────────────────

// SettingsModal holds the state for the /settings overlay.
type SettingsModal struct {
	// AutonomousMode reflects the brain's current autonomous mode.
	AutonomousMode bool
	// Cursor: 0 = autonomous toggle row
	Cursor int
}

// ── Fetch / toggle autonomous mode via brain API ──────────────────────────────

func brainURL() string {
	return "http://localhost:3100"
}

// FetchAutonomousMode reads the current state from brain.
// Returns false if brain is unavailable.
func FetchAutonomousMode() bool {
	resp, err := http.Get(brainURL() + "/v1/agent/autonomous")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var body struct {
		Autonomous bool `json:"autonomous"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return false
	}
	return body.Autonomous
}

// SetAutonomousMode tells brain to enable or disable autonomous mode.
func SetAutonomousMode(enabled bool) bool {
	payload, _ := json.Marshal(map[string]bool{"enabled": enabled})
	resp, err := http.Post(brainURL()+"/v1/agent/autonomous", "application/json", bytes.NewReader(payload))
	if err != nil {
		return enabled // optimistic
	}
	defer resp.Body.Close()
	var body struct {
		Autonomous bool `json:"autonomous"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return enabled
	}
	return body.Autonomous
}

// ── Render settings modal ─────────────────────────────────────────────────────

func RenderSettingsModal(m SettingsModal, termW, termH int) string {
	title := ModalTitleStyle.Render("⚙  Settings")
	divider := ModalDividerStyle.Render(strings.Repeat("─", 48))

	// Autonomous mode row
	autonomousLabel := "Agent Autonomous Mode"
	autonomousDesc := "Skip permission prompts for all tool calls"

	var toggleStr string
	if m.AutonomousMode {
		toggleStr = lipgloss.NewStyle().
			Foreground(ColorBlack).
			Background(ColorGreen).
			Bold(true).
			Padding(0, 1).
			Render("  ON  ")
	} else {
		toggleStr = lipgloss.NewStyle().
			Foreground(ColorWhite).
			Background(ColorGray).
			Padding(0, 1).
			Render("  OFF ")
	}

	rowStyle := lipgloss.NewStyle().Foreground(ColorWhite)
	descStyle := lipgloss.NewStyle().Foreground(ColorDimGray)

	if m.Cursor == 0 {
		rowStyle = lipgloss.NewStyle().Foreground(ColorCyan).Bold(true)
	}

	row := rowStyle.Render(autonomousLabel) + "   " + toggleStr + "\n" +
		descStyle.Render("  " + autonomousDesc)

	hint := ModalHintStyle.Render("enter/space  toggle    esc  close")

	warningStr := ""
	if m.AutonomousMode {
		warningStr = "\n" + lipgloss.NewStyle().
			Foreground(ColorYellow).
			Italic(true).
			Render("⚠  Autonomous mode: AI will run commands without asking")
	}

	content := fmt.Sprintf("%s\n%s\n\n%s%s\n\n%s\n%s",
		title, divider, row, warningStr, divider, hint)

	modal := ModalStyle.Render(content)
	return modal
}
