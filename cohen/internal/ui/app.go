package ui

import (
	"context"
	"fmt"
	"math/rand"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"cohen/tui/internal/ai"
	"cohen/tui/internal/cmd"
	"cohen/tui/internal/sessions"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ── Screen / overlay states ────────────────────────────────────────────────────

type screen int

const (
	screenWelcome screen = iota
	screenChat
)

type overlayKind int

const (
	overlayNone overlayKind = iota
	overlayHelp
	overlaySessions
	overlayModels
	overlaySettings
)

// ── Spinner frames + phrases ───────────────────────────────────────────────────

var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

func getSpinnerPhrases(name string) []string {
	return []string{
		name + " is reasoning",
		name + " is reasoning.",
		name + " is reasoning..",
		name + " is reasoning...",
	}
}

// ── Messages (tea.Cmd returns) ─────────────────────────────────────────────────

type aiResponseMsg struct {
	resp ai.Response
}

type commandOutputMsg struct {
	output string
	cmdStr string
}

type spinnerTickMsg struct{}
type phraseTickMsg struct{}
type sessionRenamedMsg struct {
	newName string
}

// permissionGrantMsg is sent when the user clicks Allow or Deny in the permission prompt.
type permissionGrantMsg struct {
	approved bool
}

// autonomousFetchedMsg is sent after reading autonomous mode from brain.
type autonomousFetchedMsg struct {
	enabled bool
}

func spinnerTickCmd() tea.Cmd {
	return tea.Tick(80*time.Millisecond, func(time.Time) tea.Msg {
		return spinnerTickMsg{}
	})
}

func phraseTickCmd() tea.Cmd {
	return tea.Tick(420*time.Millisecond, func(time.Time) tea.Msg {
		return phraseTickMsg{}
	})
}

// ── App model ─────────────────────────────────────────────────────────────────

type App struct {
	// Layout
	width  int
	height int

	// Screen state
	currentScreen screen
	overlay       overlayKind

	// Input state
	query              string
	cursorPos          int
	autocompleteCursor int // rune index within query

	// Chat
	messages []Message
	viewport viewport.Model

	// Session
	session  *sessions.Session
	aiClient *ai.Client

	// History for AI context
	aiHistory []ai.HistoryEntry

	// Loading
	loading      bool
	spinnerFrame int
	phraseIdx    int
	liveOutput   string

	// Modals
	sessionsModal SessionsModal
	modelsModal   ModelsModal
	settingsModal SettingsModal

	// Permission prompt (inline above input)
	permissionActive  bool
	permissionPrompt  PermissionPrompt
	pendingToolCmd    string // the <exec> command waiting for approval

	// Pending AI loop state
	pendingCmdOutput string

	ctx        context.Context
	cancelFunc context.CancelFunc
}

// New creates the initial App model.
func New(aiClient *ai.Client, sess *sessions.Session, loadedMsgs []Message) App {
	vp := viewport.New(80, 20)
	vp.SetContent("")
	vp.MouseWheelEnabled = true

	app := App{
		width:         80,
		height:        24,
		currentScreen: screenWelcome,
		session:       sess,
		aiClient:      aiClient,
		viewport:      vp,
		messages:      loadedMsgs,
	}

	if len(loadedMsgs) > 0 {
		app.currentScreen = screenChat
		for _, m := range loadedMsgs {
			if m.Role == RoleUser || m.Role == RoleAssistant {
				app.aiHistory = append(app.aiHistory, ai.HistoryEntry{
					Role:    string(m.Role),
					Content: m.Content,
				})
			}
		}
	}

	return app
}

// Init starts the spinner ticks.
func (a App) Init() tea.Cmd {
	return tea.SetWindowTitle("cohen - " + a.aiClient.Model.SystemName)
}

func (a *App) getAutocompleteOpts() []string {
	if !strings.HasPrefix(a.query, "/") || a.loading || a.overlay != overlayNone {
		return nil
	}
	var opts []string
	for _, c := range cmd.AllCommands {
		if strings.HasPrefix(c, a.query) && a.query != c && a.query != c+" " {
			opts = append(opts, c)
		}
	}
	return opts
}

// ── Update ─────────────────────────────────────────────────────────────────────

func (a App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {

	// ── Window resize ──────────────────────────────────────────────────────────
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		a.resizeViewport()
		a.refreshViewport()

	// ── Mouse ──────────────────────────────────────────────────────────────────
	case tea.MouseMsg:
		if msg.Action == tea.MouseActionRelease || msg.Action == tea.MouseActionPress {
			opts := a.getAutocompleteOpts()
			if len(opts) > 0 {
				if a.currentScreen == screenWelcome {
					// Need to calculate welcome screen acBox position
					bannerLines := []string{
						"██████╗ ██╗   ██╗████████╗██████╗ ███████╗██╗   ██╗",
						"██╔══██╗██║   ██║╚══██╔══╝██╔══██╗██╔════╝██║   ██║",
						"██████╔╝██║   ██║   ██║   ██║  ██║█████╗  ██║   ██║",
						"██╔═══╝ ██║   ██║   ██║   ██║  ██║██╔══╝  ╚██╗ ██╔╝",
						"██║     ╚██████╔╝   ██║   ██████╔╝███████╗ ╚████╔╝ ",
						"╚═╝      ╚═════╝    ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝  ",
					}
					bannerH := len(bannerLines) + 2 // approx subtitle height
					// inputSection H = acBox (len(opts)+3) + inputBox (3) + hint (1)
					inputH := (len(opts) + 3) + 3 + 1
					gap := 2
					totalH := bannerH + gap + inputH
					paddingTop := (a.height - totalH) / 2
					if paddingTop < 0 {
						paddingTop = 0
					}
					for i, opt := range opts {
						if msg.Y == paddingTop+bannerH+gap+1+i {
							a.query = opt + " "
							a.cursorPos = len([]rune(a.query))
							a.autocompleteCursor = 0
							return a, nil
						}
					}
				} else {
					footerH := lipgloss.Height(RenderFooter(a.width, a.query, a.cursorPos, a.loading, a.aiClient.Model.SystemName, opts, a.autocompleteCursor))
					headerH := lipgloss.Height(RenderHeader(a.width, a.session.Name, 0))
					vpH := a.height - headerH - footerH
					if vpH < 1 {
						vpH = 1
					}
					footerY := headerH + vpH
					for i, opt := range opts {
						if msg.Y == footerY+2+i {
							a.query = opt + " "
							a.cursorPos = len([]rune(a.query))
							a.autocompleteCursor = 0
							return a, nil
						}
					}
				}
			}
		}

		switch msg.Button {
		case tea.MouseButtonWheelUp:
			if a.overlay == overlaySessions {
				a.sessionsModal.MoveUp()
			} else if a.currentScreen == screenChat && a.overlay == overlayNone {
				a.viewport.LineUp(3)
			}
		case tea.MouseButtonWheelDown:
			if a.overlay == overlaySessions {
				a.sessionsModal.MoveDown()
			} else if a.currentScreen == screenChat && a.overlay == overlayNone {
				a.viewport.LineDown(3)
			}
		case tea.MouseButtonLeft:
			if a.overlay != overlayNone {
				// Click outside modal → dismiss
				if !a.isClickInsideModal(msg.X, msg.Y) {
					a.overlay = overlayNone
					return a, nil
				}
				// Click inside sessions modal → select row
				if a.overlay == overlaySessions {
					if idx := a.sessionsModal.RowAtY(msg.Y, a.width, a.height); idx >= 0 {
						a.sessionsModal.Cursor = idx
						return a.selectSession()
					}
				}
				// Click inside models modal
				if a.overlay == overlayModels {
					if idx := a.modelsModal.RowAtY(msg.Y, a.width, a.height); idx >= 0 {
						a.modelsModal.Cursor = idx
						mod := a.modelsModal.SelectedModel()
						a.aiClient.SetModel(mod.ID)
						a.overlay = overlayNone
						a.addMessage(Message{Role: RoleSystem, Content: "Model switched to " + mod.Name})
						a.refreshViewport()
						return a, nil
					}
				}
			}
		}

	// ── Keyboard ───────────────────────────────────────────────────────────────
	case tea.KeyMsg:
		// Always handle quit
		if msg.Type == tea.KeyCtrlC {
			return a, tea.Quit
		}

		// ── Permission prompt key handling ─────────────────────────────────────
		if a.permissionActive {
			return a.handlePermissionKey(msg)
		}

		// Autonomous mode fetched
		// ── Autocomplete key handling
		if opts := a.getAutocompleteOpts(); len(opts) > 0 {
			if a.autocompleteCursor >= len(opts) {
				a.autocompleteCursor = len(opts) - 1
			}
			switch msg.Type {
			case tea.KeyUp:
				a.autocompleteCursor = (a.autocompleteCursor - 1 + len(opts)) % len(opts)
				return a, nil
			case tea.KeyDown:
				a.autocompleteCursor = (a.autocompleteCursor + 1) % len(opts)
				return a, nil
			case tea.KeyTab, tea.KeyEnter:
				a.query = opts[a.autocompleteCursor] + " "
				a.cursorPos = len([]rune(a.query))
				a.autocompleteCursor = 0
				return a, nil
			}
		}

		// Help modal toggle
		if msg.Type == tea.KeyCtrlUnderscore && a.overlay == overlayNone && !a.loading {
			a.overlay = overlayHelp
			return a, nil
		}

		// Overlay key handling
		if a.overlay != overlayNone {
			return a.handleOverlayKey(msg)
		}

		// Loading: only allow Ctrl+C and Esc
		if a.loading {
			if msg.Type == tea.KeyEsc {
				if a.cancelFunc != nil {
					a.cancelFunc()
					a.cancelFunc = nil
				}
				a.loading = false
				a.liveOutput = ""
				a.addMessage(Message{Role: RoleSystem, Content: "Agent process interrupted by user."})
				a.refreshViewport()
			}
			return a, nil
		}

		switch msg.Type {
		// ── Viewport scrolling (only when no text is being typed)
		case tea.KeyUp:
			if a.currentScreen == screenChat {
				a.viewport.LineUp(1)
			}
		case tea.KeyDown:
			if a.currentScreen == screenChat {
				a.viewport.LineDown(1)
			}
		case tea.KeyPgUp:
			if a.currentScreen == screenChat {
				a.viewport.LineUp(5)
			}
		case tea.KeyPgDown:
			if a.currentScreen == screenChat {
				a.viewport.LineDown(5)
			}
		case tea.KeyHome:
			if a.currentScreen == screenChat {
				a.viewport.GotoTop()
			}
		case tea.KeyEnd:
			if a.currentScreen == screenChat {
				a.viewport.GotoBottom()
			}

		// ── Input cursor movement ──────────────────────────────────────────────
		case tea.KeyLeft:
			if a.cursorPos > 0 {
				a.cursorPos--
			}
		case tea.KeyRight:
			runes := []rune(a.query)
			if a.cursorPos < len(runes) {
				a.cursorPos++
			}
		case tea.KeyCtrlA: // jump to start of line
			a.cursorPos = 0
		case tea.KeyCtrlE: // jump to end of line
			a.cursorPos = len([]rune(a.query))

		// ── Input editing ──────────────────────────────────────────────────────
		case tea.KeyEnter:
			if strings.TrimSpace(a.query) == "" {
				return a, nil
			}
			return a.handleSubmit()

		case tea.KeyBackspace:
			runes := []rune(a.query)
			if a.cursorPos > 0 {
				runes = append(runes[:a.cursorPos-1], runes[a.cursorPos:]...)
				a.query = string(runes)
				a.cursorPos--
			}

		case tea.KeyDelete:
			runes := []rune(a.query)
			if a.cursorPos < len(runes) {
				runes = append(runes[:a.cursorPos], runes[a.cursorPos+1:]...)
				a.query = string(runes)
			}

		case tea.KeyEsc:
			// nothing here (no overlay open)

		case tea.KeyRunes, tea.KeySpace:
			// Normal typing
			var ch []rune
			if msg.Type == tea.KeySpace {
				ch = []rune(" ")
			} else {
				ch = msg.Runes
			}
			runes := []rune(a.query)
			runes = append(runes[:a.cursorPos], append(ch, runes[a.cursorPos:]...)...)
			a.query = string(runes)
			a.cursorPos += len(ch)

			// Clean up bracketed paste artifacts if they exist
			if strings.Contains(a.query, "[200~") {
				a.query = strings.ReplaceAll(a.query, "[200~", "")
				a.cursorPos -= 5
			}
			if strings.Contains(a.query, "[201~") {
				a.query = strings.ReplaceAll(a.query, "[201~", "")
				a.cursorPos -= 5
			}
			if a.cursorPos < 0 {
				a.cursorPos = 0
			}
		}

	// ── Spinner ticks ─────────────────────────────────────────────────────────
	case spinnerTickMsg:
		if a.loading {
			a.spinnerFrame = (a.spinnerFrame + 1) % len(spinnerFrames)
			cmds = append(cmds, spinnerTickCmd())
		}
	case phraseTickMsg:
		if a.loading {
			phrases := getSpinnerPhrases(a.aiClient.Model.SystemName)
			a.phraseIdx = (a.phraseIdx + 1) % len(phrases)
			cmds = append(cmds, phraseTickCmd())
		}

	// ── AI response ───────────────────────────────────────────────────────────
	case aiResponseMsg:
		if !a.loading {
			return a, nil
		}
		resp := msg.resp
		if resp.Err != nil {
			a.addMessage(Message{
				Role:    RoleError,
				Content: fmt.Sprintf("AI error: %s", resp.Err.Error()),
			})
			a.loading = false
			a.liveOutput = ""
			a.refreshViewport()
			return a, nil
		}

		// Add assistant message
		a.addMessage(Message{
			Role:     RoleAssistant,
			Thinking: resp.Thinking,
			Content:  resp.Text,
		})
		a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: "assistant", Content: resp.Text})

		// Check for auto-rename if this is the first response
		userMsgCount := 0
		var firstUserMsg string
		for _, m := range a.messages {
			if m.Role == RoleUser {
				if userMsgCount == 0 {
					firstUserMsg = m.Content
				}
				userMsgCount++
			}
		}

		var renameCmd tea.Cmd
		if userMsgCount == 1 && firstUserMsg != "" {
			client := a.aiClient
			renameCmd = func() tea.Msg {
				title := client.GenerateTitle(firstUserMsg)
				return sessionRenamedMsg{newName: title}
			}
		}

		var replyCmds []tea.Cmd
		if renameCmd != nil {
			replyCmds = append(replyCmds, renameCmd)
		}

		// Check for tool tags in the AI response
		execRe := regexp.MustCompile(`(?s)<exec>(.*?)</exec>`)
		if match := execRe.FindStringSubmatch(resp.Text); len(match) > 1 {
			cmdStr := strings.TrimSpace(match[1])
			a.liveOutput = ""

			if a.settingsModal.AutonomousMode {
				// Autonomous mode: execute immediately
				ctx := a.ctx
				replyCmds = append(replyCmds, func() tea.Msg {
					out := runShellCommand(ctx, cmdStr)
					return commandOutputMsg{output: out, cmdStr: cmdStr}
				})
				return a, tea.Batch(replyCmds...)
			}

			// Permission mode: show prompt above input, pause loading
			a.loading = false
			a.pendingToolCmd = cmdStr
			a.permissionActive = true
			a.permissionPrompt = PermissionPrompt{
				ToolName: "Run Command",
				Args:     "$ " + cmdStr,
				Cursor:   0, // default Allow
			}
			a.refreshViewport()
			return a, tea.Batch(replyCmds...)
		}

		a.loading = false
		a.liveOutput = ""
		a.refreshViewport()
		a.autoSave()
		return a, tea.Batch(replyCmds...)

	// ── Terminal command output ────────────────────────────────────────────────
	case commandOutputMsg:
		if !a.loading {
			return a, nil
		}
		a.addMessage(Message{
			Role:    RoleTerminal,
			Content: msg.output,
		})
		a.liveOutput = ""

		// Feed output back to AI (loop)
		followUp := fmt.Sprintf("Command output:\n%s", msg.output)
		a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: "user", Content: followUp})
		histCopy := make([]ai.HistoryEntry, len(a.aiHistory))
		copy(histCopy, a.aiHistory)
		client := a.aiClient
		ctx := a.ctx
		return a, func() tea.Msg {
			return aiResponseMsg{resp: client.Ask(ctx, followUp, histCopy[:len(histCopy)-1])}
		}

	// ── Auto-rename session ──────────────────────────────────────────────────
	case sessionRenamedMsg:
		updated := sessions.Rename(a.session, msg.newName)
		a.session = updated
		_ = sessions.Save(updated)
		a.addMessage(Message{Role: RoleSystem, Content: fmt.Sprintf(`Session auto-renamed to: "%s"`, msg.newName)})
		a.refreshViewport()
		return a, nil

	// ── Permission and settings async messages ─────────────────────────────────
	case permissionGrantMsg:
		a.permissionActive = false
		if msg.approved {
			cmdStr := a.pendingToolCmd
			a.pendingToolCmd = ""
			a.loading = true
			a.liveOutput = ""
			a.refreshViewport()
			ctx := a.ctx
			return a, func() tea.Msg {
				out := runShellCommand(ctx, cmdStr)
				return commandOutputMsg{output: out, cmdStr: cmdStr}
			}
		}
		// Denied
		a.pendingToolCmd = ""
		a.addMessage(Message{Role: RoleSystem, Content: "Tool call denied."})
		a.refreshViewport()
		return a, nil

	case autonomousFetchedMsg:
		a.settingsModal.AutonomousMode = msg.enabled
		return a, nil
	}


	// Propagate to viewport if in chat (lets viewport handle its own key bindings too)
	if a.currentScreen == screenChat && a.overlay == overlayNone && !a.permissionActive {
		var vpCmd tea.Cmd
		a.viewport, vpCmd = a.viewport.Update(msg)
		cmds = append(cmds, vpCmd)
	}

	return a, tea.Batch(cmds...)
}

// isClickInsideModal returns true if (x,y) falls within the centered modal box.
// We approximate based on the known modal dimensions.
func (a App) isClickInsideModal(x, y int) bool {
	var modalW, estH int
	if a.overlay == overlaySessions {
		modalW, estH = sessionModalDims(a.width, len(a.sessionsModal.Filtered()))
	} else if a.overlay == overlayModels {
		modalW = a.width * 40 / 100
		if modalW < 40 {
			modalW = 40
		}
		if modalW > a.width-6 {
			modalW = a.width - 6
		}
		estH = len(ai.GetModels()) + 4
	} else {
		// fallback for help modal or others
		modalW = a.width * 60 / 100
		if modalW < 60 {
			modalW = 60
		}
		if modalW > a.width-4 {
			modalW = a.width - 4
		}
		estH = 20
	}
	left := (a.width - modalW) / 2
	right := left + modalW
	top := (a.height - estH) / 2
	bottom := top + estH
	return x >= left && x <= right && y >= top && y <= bottom
}

// handleOverlayKey routes key events when a modal is open.
func (a App) handleOverlayKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch a.overlay {
	case overlayHelp:
		switch msg.String() {
		case "esc", "enter", "q", "?":
			a.overlay = overlayNone
		}

	case overlaySessions:
		switch msg.Type {
		case tea.KeyUp:
			a.sessionsModal.MoveUp()
		case tea.KeyDown:
			a.sessionsModal.MoveDown()
		case tea.KeyEnter:
			return a.selectSession()
		case tea.KeyEsc:
			a.overlay = overlayNone

		// Search query cursor movement
		case tea.KeyLeft:
			if a.sessionsModal.SearchCursor > 0 {
				a.sessionsModal.SearchCursor--
			}
		case tea.KeyRight:
			runes := []rune(a.sessionsModal.SearchQuery)
			if a.sessionsModal.SearchCursor < len(runes) {
				a.sessionsModal.SearchCursor++
			}
		case tea.KeyCtrlA:
			a.sessionsModal.SearchCursor = 0
		case tea.KeyCtrlE:
			a.sessionsModal.SearchCursor = len([]rune(a.sessionsModal.SearchQuery))

		// Search typing
		case tea.KeyBackspace:
			runes := []rune(a.sessionsModal.SearchQuery)
			if a.sessionsModal.SearchCursor > 0 {
				runes = append(runes[:a.sessionsModal.SearchCursor-1], runes[a.sessionsModal.SearchCursor:]...)
				a.sessionsModal.SearchQuery = string(runes)
				a.sessionsModal.SearchCursor--
				a.sessionsModal.Cursor = 0
				a.sessionsModal.ScrollOffset = 0
			}
		case tea.KeyDelete:
			runes := []rune(a.sessionsModal.SearchQuery)
			if a.sessionsModal.SearchCursor < len(runes) {
				runes = append(runes[:a.sessionsModal.SearchCursor], runes[a.sessionsModal.SearchCursor+1:]...)
				a.sessionsModal.SearchQuery = string(runes)
				a.sessionsModal.Cursor = 0
				a.sessionsModal.ScrollOffset = 0
			}
		case tea.KeySpace:
			runes := []rune(a.sessionsModal.SearchQuery)
			runes = append(runes[:a.sessionsModal.SearchCursor], append([]rune{' '}, runes[a.sessionsModal.SearchCursor:]...)...)
			a.sessionsModal.SearchQuery = string(runes)
			a.sessionsModal.SearchCursor++
			a.sessionsModal.Cursor = 0
			a.sessionsModal.ScrollOffset = 0
		case tea.KeyRunes:
			s := msg.String()
			s = strings.ReplaceAll(s, "[200~", "")
			s = strings.ReplaceAll(s, "[201~", "")
			ch := []rune(s)
			runes := []rune(a.sessionsModal.SearchQuery)
			runes = append(runes[:a.sessionsModal.SearchCursor], append(ch, runes[a.sessionsModal.SearchCursor:]...)...)
			a.sessionsModal.SearchQuery = string(runes)
			a.sessionsModal.SearchCursor += len(ch)
			a.sessionsModal.Cursor = 0
			a.sessionsModal.ScrollOffset = 0

		// Shortcuts
		case tea.KeyCtrlF: // pin/unpin
			sel := a.sessionsModal.SelectedSession()
			if sel != nil {
				updated := sessions.TogglePin(sel)
				_ = sessions.Save(updated)

				// Update in-memory list
				for i, s := range a.sessionsModal.Sessions {
					if s.ID == updated.ID {
						a.sessionsModal.Sessions[i] = *updated
						break
					}
				}
				// Re-sort
				all, _ := sessions.List()
				a.sessionsModal.Sessions = all

				// Update current if we pinned the active session
				if a.session != nil && a.session.ID == updated.ID {
					a.session = updated
				}
			}
		case tea.KeyCtrlD: // delete
			sel := a.sessionsModal.SelectedSession()
			if sel != nil {
				_ = sessions.Delete(sel.ID)
				all, _ := sessions.List()
				a.sessionsModal.Sessions = all
				a.sessionsModal.Cursor = 0
				a.sessionsModal.ScrollOffset = 0

				// If we deleted the active session, start a new one
				if a.session != nil && a.session.ID == sel.ID {
					return a.newSession()
				}
			}
		case tea.KeyCtrlR: // rename
			sel := a.sessionsModal.SelectedSession()
			if sel != nil {
				// Switch to chat if necessary, and populate query with "/rename "
				a.overlay = overlayNone
				if a.currentScreen == screenWelcome {
					a.currentScreen = screenChat
				}
				a.query = fmt.Sprintf("/rename %s", sel.Name)
				a.cursorPos = len([]rune(a.query))

				// Also switch to it if not active
				if a.session == nil || a.session.ID != sel.ID {
					a.session = sel
					a.messages = nil
					a.aiHistory = nil
					for _, m := range sel.Messages {
						mParsed := FromSessionMessage(m)
						mParsed.ID = uid()
						a.messages = append(a.messages, mParsed)
						if m.Role == "user" || m.Role == "assistant" {
							a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: m.Role, Content: m.Content})
						}
					}
					a.refreshViewport()
					a.viewport.GotoBottom()
				}
				return a, nil
			}
		}

	case overlayModels:
		switch msg.Type {
		case tea.KeyUp:
			a.modelsModal.MoveUp()
		case tea.KeyDown:
			a.modelsModal.MoveDown()
		case tea.KeyEnter:
			mod := a.modelsModal.SelectedModel()
			a.aiClient.SetModel(mod.ID)
			a.overlay = overlayNone
			a.addMessage(Message{Role: RoleSystem, Content: "Model switched to " + mod.Name})
			a.refreshViewport()
			return a, nil
		case tea.KeyEsc:
			a.overlay = overlayNone
		}

	case overlaySettings:
		switch msg.Type {
		case tea.KeyEsc:
			a.overlay = overlayNone
		case tea.KeyEnter, tea.KeySpace:
			// Toggle autonomous mode
			newVal := !a.settingsModal.AutonomousMode
			return a, func() tea.Msg {
				enabled := SetAutonomousMode(newVal)
				return autonomousFetchedMsg{enabled: enabled}
			}
		}
	}
	return a, nil
}

// handlePermissionKey routes key events when the permission prompt is active.
func (a App) handlePermissionKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyLeft:
		a.permissionPrompt.Cursor = 0 // Allow
	case tea.KeyRight:
		a.permissionPrompt.Cursor = 1 // Deny
	case tea.KeyEnter:
		approved := a.permissionPrompt.Cursor == 0
		a.permissionActive = false
		if approved {
			cmdStr := a.pendingToolCmd
			a.pendingToolCmd = ""
			a.loading = true
			a.liveOutput = ""
			a.refreshViewport()
			ctx := a.ctx
			return a, func() tea.Msg {
				out := runShellCommand(ctx, cmdStr)
				return commandOutputMsg{output: out, cmdStr: cmdStr}
			}
		}
		a.pendingToolCmd = ""
		a.addMessage(Message{Role: RoleSystem, Content: "Tool call denied by user."})
		a.refreshViewport()
		return a, nil
	case tea.KeyEsc:
		// Treat Esc as Deny
		a.permissionActive = false
		a.pendingToolCmd = ""
		a.addMessage(Message{Role: RoleSystem, Content: "Tool call denied by user."})
		a.refreshViewport()
		return a, nil
	case tea.KeyRunes:
		switch msg.String() {
		case "y", "Y":
			a.permissionPrompt.Cursor = 0
			a.permissionActive = false
			cmdStr := a.pendingToolCmd
			a.pendingToolCmd = ""
			a.loading = true
			a.liveOutput = ""
			a.refreshViewport()
			ctx := a.ctx
			return a, func() tea.Msg {
				out := runShellCommand(ctx, cmdStr)
				return commandOutputMsg{output: out, cmdStr: cmdStr}
			}
		case "n", "N":
			a.permissionActive = false
			a.pendingToolCmd = ""
			a.addMessage(Message{Role: RoleSystem, Content: "Tool call denied by user."})
			a.refreshViewport()
			return a, nil
		case "s", "S":
			// Open settings from the permission prompt
			a.overlay = overlaySettings
			return a, nil
		}
	}
	return a, nil
}



// selectSession handles Enter / click in the sessions modal.
func (a App) selectSession() (tea.Model, tea.Cmd) {
	if a.sessionsModal.IsNewSelected() {
		return a.newSession()
	}
	picked := a.sessionsModal.SelectedSession()
	if picked == nil {
		a.overlay = overlayNone
		return a, nil
	}
	a.session = picked
	a.messages = nil
	a.aiHistory = nil
	for _, m := range picked.Messages {
		msg := FromSessionMessage(m)
		msg.ID = uid()
		a.messages = append(a.messages, msg)
		if m.Role == "user" || m.Role == "assistant" {
			a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: m.Role, Content: m.Content})
		}
	}
	a.addMessage(Message{Role: RoleSystem, Content: fmt.Sprintf(`Switched to: "%s"`, picked.Name)})
	a.overlay = overlayNone
	a.currentScreen = screenChat
	a.refreshViewport()
	a.viewport.GotoBottom()
	return a, nil
}

func (a App) newSession() (tea.Model, tea.Cmd) {
	fresh := sessions.Create("")
	a.session = fresh
	a.messages = nil
	a.aiHistory = nil
	a.query = ""
	a.cursorPos = 0
	a.overlay = overlayNone
	a.currentScreen = screenWelcome
	return a, nil
}

// handleSubmit processes the current query.
func (a App) handleSubmit() (tea.Model, tea.Cmd) {
	input := strings.TrimSpace(a.query)
	if input == "" || a.loading {
		return a, nil
	}
	a.query = ""
	a.cursorPos = 0

	// Parse slash commands
	result := cmd.Parse(input)
	if result.IsCommand {
		switch result.Action {
		case cmd.ActionExit:
			return a, tea.Quit
		case cmd.ActionHelp:
			a.overlay = overlayHelp
		case cmd.ActionSessions:
			a.sessionsModal = NewSessionsModal(a.session.ID)
			a.overlay = overlaySessions
		case cmd.ActionModel:
			a.overlay = overlayModels
			a.modelsModal = ModelsModal{}
			models := ai.GetModels()
			for i, mod := range models {
				if mod.ID == a.aiClient.Model.ID {
					a.modelsModal.Cursor = i
					break
				}
			}
		case cmd.ActionSettings:
			a.overlay = overlaySettings
			// Fetch current autonomous mode from brain
			return a, func() tea.Msg {
				return autonomousFetchedMsg{enabled: FetchAutonomousMode()}
			}
		case cmd.ActionNew:
			return a.newSession()
		case cmd.ActionClear:
			a.messages = nil
			a.aiHistory = nil
			a.addMessage(Message{Role: RoleSystem, Content: "Session history cleared."})
			a.refreshViewport()
		case cmd.ActionRename:
			updated := sessions.Rename(a.session, result.Extra)
			a.session = updated
			_ = sessions.Save(updated)
			a.addMessage(Message{Role: RoleSystem, Content: fmt.Sprintf(`Renamed to: "%s"`, result.Extra)})
			a.refreshViewport()
		}
		return a, nil
	}

	if a.currentScreen == screenWelcome {
		a.currentScreen = screenChat
	}

	// Add user message + start AI request
	a.addMessage(Message{Role: RoleUser, Content: input})
	a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: "user", Content: input})
	a.loading = true

	a.ctx, a.cancelFunc = context.WithCancel(context.Background())

	a.refreshViewport()
	a.viewport.GotoBottom()

	histCopy := make([]ai.HistoryEntry, len(a.aiHistory))
	copy(histCopy, a.aiHistory)
	inputCopy := input
	client := a.aiClient
	ctx := a.ctx

	cmds := []tea.Cmd{
		spinnerTickCmd(),
		phraseTickCmd(),
		func() tea.Msg {
			return aiResponseMsg{resp: client.Ask(ctx, inputCopy, histCopy[:len(histCopy)-1])}
		},
	}

	return a, tea.Batch(cmds...)
}

// addMessage appends a message to the list.
func (a *App) addMessage(m Message) {
	if m.ID == "" {
		m.ID = uid()
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = time.Now()
	}
	a.messages = append(a.messages, m)
	a.refreshViewport()
}

// resizeViewport updates viewport dimensions after a terminal resize.
func (a *App) resizeViewport() {
	headerH := 3
	footerH := 5
	vpH := a.height - headerH - footerH
	if vpH < 1 {
		vpH = 1
	}
	a.viewport.Width = a.width - 2
	a.viewport.Height = vpH
}

// refreshViewport re-renders all messages into the viewport content.
func (a *App) refreshViewport() {
	content := RenderMessages(a.messages, a.viewport.Width, a.aiClient.Model.SystemName)
	if a.loading {
		spinner := SpinnerStyle.Render(spinnerFrames[a.spinnerFrame]) +
			SpinnerTextStyle.Render(getSpinnerPhrases(a.aiClient.Model.SystemName)[a.phraseIdx])
		if a.liveOutput != "" {
			liveBox := TerminalBoxStyle.Width(a.viewport.Width - 6).Render(
				TerminalLabelStyle.Render("$ live") + "\n" +
					TerminalOutputStyle.Render(a.liveOutput),
			)
			content += liveBox + "\n"
		}
		content += spinner + "\n"
	}
	a.viewport.SetContent(content)
}

// autoSave persists the current session.
func (a *App) autoSave() {
	var msgs []sessions.SessionMessage
	for _, m := range a.messages {
		if m.Role == RoleUser || m.Role == RoleAssistant || m.Role == RoleTerminal {
			msgs = append(msgs, sessions.SessionMessage{
				Role:      string(m.Role),
				Content:   m.Content,
				Thinking:  m.Thinking,
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			})
		}
	}
	updated := sessions.Update(a.session, msgs)
	a.session = updated
	_ = sessions.Save(updated)
}

// ── View ───────────────────────────────────────────────────────────────────────

func (a App) View() string {
	// Welcome screen
	if a.currentScreen == screenWelcome {
		base := RenderWelcome(a.width, a.height, a.query, a.cursorPos, a.aiClient.Model.SystemName, a.getAutocompleteOpts(), a.autocompleteCursor)
		switch a.overlay {
		case overlayHelp:
			return overlayOnBase(base, RenderHelpModal(a.width, a.height), a.width, a.height)
		case overlaySessions:
			return overlayOnBase(base, RenderSessionsModal(a.sessionsModal, a.width, a.height), a.width, a.height)
		case overlayModels:
			return overlayOnBase(base, RenderModelsModal(a.modelsModal, a.width, a.height), a.width, a.height)
		case overlaySettings:
			return overlayOnBase(base, RenderSettingsModal(a.settingsModal, a.width, a.height), a.width, a.height)
		}
		return base
	}

	// Chat screen
	msgCount := 0
	for _, m := range a.messages {
		if m.Role == RoleUser {
			msgCount++
		}
	}

	header := RenderHeader(a.width, a.session.Name, msgCount)
	footer := RenderFooter(a.width, a.query, a.cursorPos, a.loading, a.aiClient.Model.SystemName, a.getAutocompleteOpts(), a.autocompleteCursor)

	// Inject permission prompt above footer if active
	if a.permissionActive {
		permStr := RenderPermissionPrompt(a.permissionPrompt, a.width)
		permH := lipgloss.Height(permStr)
		footerH := lipgloss.Height(footer)
		vpH := a.height - lipgloss.Height(header) - footerH - permH
		if vpH < 1 {
			vpH = 1
		}
		if a.viewport.Height != vpH {
			a.viewport.Height = vpH
		}
		chat := lipgloss.NewStyle().Width(a.width).Height(vpH).Render(a.viewport.View())
		return lipgloss.JoinVertical(lipgloss.Left, header, chat, permStr, footer)
	}

	// Size viewport between header and footer
	headerH := lipgloss.Height(header)
	footerH := lipgloss.Height(footer)
	vpH := a.height - headerH - footerH
	if vpH < 1 {
		vpH = 1
	}
	if a.viewport.Height != vpH || a.viewport.Width != a.width-2 {
		a.viewport.Height = vpH
		a.viewport.Width = a.width - 2
		a.refreshViewport()
	}

	chat := lipgloss.NewStyle().
		Width(a.width).
		Height(vpH).
		Render(a.viewport.View())

	base := lipgloss.JoinVertical(lipgloss.Left, header, chat, footer)

	// Overlay on top
	switch a.overlay {
	case overlayHelp:
		modalStr := RenderHelpModal(a.width, a.height)
		return overlayOnBase(base, modalStr, a.width, a.height)
	case overlaySessions:
		modalStr := RenderSessionsModal(a.sessionsModal, a.width, a.height)
		return overlayOnBase(base, modalStr, a.width, a.height)
	case overlayModels:
		modalStr := RenderModelsModal(a.modelsModal, a.width, a.height)
		return overlayOnBase(base, modalStr, a.width, a.height)
	case overlaySettings:
		modalStr := RenderSettingsModal(a.settingsModal, a.width, a.height)
		return overlayOnBase(base, modalStr, a.width, a.height)
	}

	return base
}

// overlayOnBase composites a modal string over a dimmed version of the base view.
// This gives the 'see-through' effect: base content is visible but grayed out,
// while the modal sits in the centre at full brightness.
var ansiStripRe = regexp.MustCompile(`\x1b\[[0-9;]*[mGKHJFABCDsulh]`)

func stripAnsi(s string) string {
	return ansiStripRe.ReplaceAllString(s, "")
}

func overlayOnBase(base, modal string, termW, termH int) string {
	// Fix base to exactly termW × termH
	baseFixed := lipgloss.NewStyle().Width(termW).Height(termH).Render(base)
	baseLines := strings.Split(baseFixed, "\n")
	for len(baseLines) < termH {
		baseLines = append(baseLines, strings.Repeat(" ", termW))
	}
	if len(baseLines) > termH {
		baseLines = baseLines[:termH]
	}

	// Strip ANSI from each base line and pad to terminal width
	rawLines := make([][]rune, termH)
	for i := 0; i < termH; i++ {
		runes := []rune(stripAnsi(baseLines[i]))
		for len(runes) < termW {
			runes = append(runes, ' ')
		}
		if len(runes) > termW {
			runes = runes[:termW]
		}
		rawLines[i] = runes
	}

	// Parse modal lines and find its dimensions
	modalLines := strings.Split(modal, "\n")
	mH := len(modalLines)
	mW := 0
	for _, l := range modalLines {
		if w := lipgloss.Width(l); w > mW {
			mW = w
		}
	}

	startY := (termH - mH) / 2
	startX := (termW - mW) / 2
	if startY < 0 {
		startY = 0
	}
	if startX < 0 {
		startX = 0
	}

	dim := lipgloss.NewStyle().Foreground(lipgloss.Color("#3a3a3a"))

	var out strings.Builder
	for i := 0; i < termH; i++ {
		raw := rawLines[i]
		overlayIdx := i - startY

		if overlayIdx >= 0 && overlayIdx < mH {
			mLine := modalLines[overlayIdx]
			mLineW := lipgloss.Width(mLine)

			// Left: dim base content to the left of modal
			leftEnd := startX
			if leftEnd > len(raw) {
				leftEnd = len(raw)
			}
			left := dim.Render(string(raw[:leftEnd]))

			// Right: dim base content to the right of modal
			rightStart := startX + mLineW
			right := ""
			if rightStart < len(raw) {
				right = dim.Render(string(raw[rightStart:]))
			}

			out.WriteString(left + mLine + right)
		} else {
			// No modal on this line, dim the whole thing
			out.WriteString(dim.Render(string(raw)))
		}

		if i < termH-1 {
			out.WriteByte('\n')
		}
	}
	return out.String()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

var uidRng = rand.New(rand.NewSource(time.Now().UnixNano()))

func uid() string {
	return fmt.Sprintf("%x", uidRng.Int63())
}

// runShellCommand executes a shell command and returns combined stdout+stderr.
func runShellCommand(ctx context.Context, command string) string {
	c := exec.CommandContext(ctx, "/bin/sh", "-c", command)
	out, err := c.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			return string(out) + "\nProcess interrupted."
		}
		return string(out) + "\nError: " + err.Error()
	}
	return string(out)
}
