package ui

import (
	"fmt"
	"math/rand"
	"os/exec"
	"regexp"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/bubbles/viewport"
	"github.com/charmbracelet/lipgloss"
	"putdev/tui/internal/ai"
	"putdev/tui/internal/cmd"
	"putdev/tui/internal/sessions"
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
)

// ── Spinner frames + phrases ───────────────────────────────────────────────────

var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
var spinnerPhrases = []string{
	"Ozias is reasoning",
	"Ozias is reasoning.",
	"Ozias is reasoning..",
	"Ozias is reasoning...",
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

	// Input — query text + cursor position (rune index)
	query      string
	cursorPos  int // rune index within query

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

	// Pending AI loop state
	pendingCmdOutput string
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
	return tea.SetWindowTitle("PUTDEV — Ozias")
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

	// ── Mouse events ───────────────────────────────────────────────────────────
	case tea.MouseMsg:
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
			}
		}

	// ── Keyboard ───────────────────────────────────────────────────────────────
	case tea.KeyMsg:
		// Always handle quit
		if msg.Type == tea.KeyCtrlC {
			return a, tea.Quit
		}

		// Help modal toggle
		if msg.String() == "?" && a.overlay == overlayNone && !a.loading {
			a.overlay = overlayHelp
			return a, nil
		}

		// Overlay key handling
		if a.overlay != overlayNone {
			return a.handleOverlayKey(msg)
		}

		// Loading: only allow Ctrl+C
		if a.loading {
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

		case tea.KeySpace:
			// Insert a space at cursor position
			runes := []rune(a.query)
			runes = append(runes[:a.cursorPos], append([]rune{' '}, runes[a.cursorPos:]...)...)
			a.query = string(runes)
			a.cursorPos++

		case tea.KeyEsc:
			// nothing here (no overlay open)

		case tea.KeyRunes:
			// Any other printable character — insert at cursor
			s := msg.String()
			s = strings.ReplaceAll(s, "[200~", "")
			s = strings.ReplaceAll(s, "[201~", "")
			ch := []rune(s)
			runes := []rune(a.query)
			runes = append(runes[:a.cursorPos], append(ch, runes[a.cursorPos:]...)...)
			a.query = string(runes)
			a.cursorPos += len(ch)
		}

	// ── Spinner ticks ─────────────────────────────────────────────────────────
	case spinnerTickMsg:
		if a.loading {
			a.spinnerFrame = (a.spinnerFrame + 1) % len(spinnerFrames)
			cmds = append(cmds, spinnerTickCmd())
		}
	case phraseTickMsg:
		if a.loading {
			a.phraseIdx = (a.phraseIdx + 1) % len(spinnerPhrases)
			cmds = append(cmds, phraseTickCmd())
		}

	// ── AI response ───────────────────────────────────────────────────────────
	case aiResponseMsg:
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

		// Check for <exec> tag — RE2-safe (no backreferences)
		execRe := regexp.MustCompile(`(?s)<exec>(.*?)</exec>`)
		if match := execRe.FindStringSubmatch(resp.Text); len(match) > 1 {
			cmdStr := strings.TrimSpace(match[1])
			a.liveOutput = ""
			replyCmds = append(replyCmds, func() tea.Msg {
				out := runShellCommand(cmdStr)
				return commandOutputMsg{output: out, cmdStr: cmdStr}
			})
			return a, tea.Batch(replyCmds...)
		}

		// No command — done
		a.loading = false
		a.liveOutput = ""
		a.refreshViewport()
		a.autoSave()
		return a, tea.Batch(replyCmds...)

	// ── Terminal command output ────────────────────────────────────────────────
	case commandOutputMsg:
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
		return a, func() tea.Msg {
			return aiResponseMsg{resp: client.Ask(followUp, histCopy[:len(histCopy)-1])}
		}

	// ── Auto-rename session ──────────────────────────────────────────────────
	case sessionRenamedMsg:
		updated := sessions.Rename(a.session, msg.newName)
		a.session = updated
		_ = sessions.Save(updated)
		a.addMessage(Message{Role: RoleSystem, Content: fmt.Sprintf(`Session auto-renamed to: "%s"`, msg.newName)})
		a.refreshViewport()
		return a, nil
	}

	// Propagate to viewport if in chat (lets viewport handle its own key bindings too)
	if a.currentScreen == screenChat && a.overlay == overlayNone {
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

	// Normal message — switch to chat if on welcome screen
	if a.currentScreen == screenWelcome {
		a.currentScreen = screenChat
	}

	// Add user message + start AI request
	a.addMessage(Message{Role: RoleUser, Content: input})
	a.aiHistory = append(a.aiHistory, ai.HistoryEntry{Role: "user", Content: input})
	a.loading = true
	a.refreshViewport()
	a.viewport.GotoBottom()

	histCopy := make([]ai.HistoryEntry, len(a.aiHistory))
	copy(histCopy, a.aiHistory)
	inputCopy := input
	client := a.aiClient

	cmds := []tea.Cmd{
		spinnerTickCmd(),
		phraseTickCmd(),
		func() tea.Msg {
			return aiResponseMsg{resp: client.Ask(inputCopy, histCopy[:len(histCopy)-1])}
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
	content := RenderMessages(a.messages, a.viewport.Width)
	if a.loading {
		spinner := SpinnerStyle.Render(spinnerFrames[a.spinnerFrame]) +
			SpinnerTextStyle.Render(spinnerPhrases[a.phraseIdx])
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
		base := RenderWelcome(a.width, a.height, a.query, a.cursorPos)
		switch a.overlay {
		case overlayHelp:
			return overlayOnBase(base, RenderHelpModal(a.width, a.height), a.width, a.height)
		case overlaySessions:
			return overlayOnBase(base, RenderSessionsModal(a.sessionsModal, a.width, a.height), a.width, a.height)
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
	footer := RenderFooter(a.width, a.query, a.cursorPos, a.loading)

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

	// Overlay on top — composited over the dimmed base
	switch a.overlay {
	case overlayHelp:
		modalStr := RenderHelpModal(a.width, a.height)
		return overlayOnBase(base, modalStr, a.width, a.height)
	case overlaySessions:
		modalStr := RenderSessionsModal(a.sessionsModal, a.width, a.height)
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
			// No modal on this line — dim the whole thing
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
func runShellCommand(command string) string {
	c := exec.Command("/bin/sh", "-c", command)
	out, err := c.CombinedOutput()
	if err != nil {
		return string(out) + "\nError: " + err.Error()
	}
	return string(out)
}
