package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/joho/godotenv"
	"putdev/tui/internal/ai"
	"putdev/tui/internal/sessions"
	"putdev/tui/internal/ui"
)

func main() {
	// Load .env from the directory of the binary (or current dir)
	_ = godotenv.Load()

	// Parse CLI flags (same as React TUI)
	args := os.Args[1:]
	openPicker := false
	var loadID string
	for _, a := range args {
		if a == "--session-picker" {
			openPicker = true
		}
		if len(a) > 10 && a[:10] == "--session=" {
			loadID = a[10:]
		}
	}

	// AI client
	aiClient := ai.New()

	// Session setup
	var sess *sessions.Session
	var loadedMsgs []ui.Message

	if loadID != "" {
		s, err := sessions.Load(loadID)
		if err == nil {
			sess = s
			for _, m := range s.Messages {
				msg := ui.FromSessionMessage(m)
				loadedMsgs = append(loadedMsgs, msg)
			}
		}
	}
	if sess == nil {
		sess = sessions.Create("")
		_ = sessions.Save(sess)
	}

	// Build and start the app
	app := ui.New(aiClient, sess, loadedMsgs)

	// If --session-picker flag was passed, open sessions overlay immediately
	if openPicker {
		// We can't directly set state before the program starts; we'll handle
		// this via an InitMsg in a future enhancement. For now, the user can
		// type /sessions.
		_ = openPicker
	}

	p := tea.NewProgram(
		app,
		tea.WithAltScreen(),
	)

	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
