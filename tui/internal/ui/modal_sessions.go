package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"putdev/tui/internal/sessions"
)

// SessionsModal holds all state for the sessions picker overlay.
type SessionsModal struct {
	Sessions     []sessions.Session
	Cursor       int // 0 = New Session, 1+ = index into FilteredSessions
	CurrentID    string
	ScrollOffset int // how many session rows from top are hidden
	SearchQuery  string
	SearchCursor int
}

// maxVisible controls how many session rows show before scrolling kicks in.
const maxVisible = 8

// NewSessionsModal creates the modal fresh from disk.
func NewSessionsModal(currentID string) SessionsModal {
	sess, _ := sessions.List()
	return SessionsModal{
		Sessions:  sess,
		Cursor:    0,
		CurrentID: currentID,
	}
}

// Filtered returns the list of sessions matching the search query.
func (m *SessionsModal) Filtered() []sessions.Session {
	if m.SearchQuery == "" {
		return m.Sessions
	}
	var filtered []sessions.Session
	q := strings.ToLower(m.SearchQuery)
	for _, s := range m.Sessions {
		if strings.Contains(strings.ToLower(s.Name), q) {
			filtered = append(filtered, s)
		}
	}
	return filtered
}

func (m *SessionsModal) total() int { return len(m.Filtered()) + 1 }

// MoveUp moves cursor up, adjusting scroll offset if needed.
func (m *SessionsModal) MoveUp() {
	m.Cursor = (m.Cursor - 1 + m.total()) % m.total()
	m.clampScroll()
}

// MoveDown moves cursor down, adjusting scroll offset if needed.
func (m *SessionsModal) MoveDown() {
	m.Cursor = (m.Cursor + 1) % m.total()
	m.clampScroll()
}

func (m *SessionsModal) clampScroll() {
	if m.Cursor == 0 {
		m.ScrollOffset = 0
		return
	}
	si := m.Cursor - 1
	if si < m.ScrollOffset {
		m.ScrollOffset = si
	}
	if si >= m.ScrollOffset+maxVisible {
		m.ScrollOffset = si - maxVisible + 1
	}
}

// SelectedSession returns the highlighted session or nil if "New" is selected.
func (m *SessionsModal) SelectedSession() *sessions.Session {
	if m.Cursor == 0 {
		return nil
	}
	filtered := m.Filtered()
	if m.Cursor-1 >= len(filtered) {
		return nil
	}
	s := filtered[m.Cursor-1]
	return &s
}

// IsNewSelected returns true when the "New Session" row is highlighted.
func (m *SessionsModal) IsNewSelected() bool { return m.Cursor == 0 }

// RowAtY maps a terminal Y click coordinate to a cursor index.
// Returns -1 if the click doesn't land on a row.
func (m *SessionsModal) RowAtY(clickY, termW, termH int) int {
	filtered := m.Filtered()
	mW, mH := sessionModalDims(termW, len(filtered))
	_ = mW
	topY := (termH - mH) / 2
	if topY < 0 {
		topY = 0
	}
	// layout: topY+0 = top border, topY+1 = title, topY+2 = divider, topY+3 = "New Session" row
	// then each session = 1 line, then dividers between
	firstRowY := topY + 3
	relY := clickY - firstRowY
	if relY < 0 {
		return -1
	}
	// Row 0 → "New Session"
	if relY == 0 {
		return 0
	}
	relY-- // past "New Session"
	absIdx := m.ScrollOffset + relY
	if absIdx >= len(filtered) {
		return -1
	}
	return absIdx + 1
}

// sessionModalDims returns (width, estimatedHeight) for hit-testing.
func sessionModalDims(termW, sessionCount int) (int, int) {
	w := termW * 55 / 100
	if w < 56 {
		w = 56
	}
	if w > termW-6 {
		w = termW - 6
	}
	shown := sessionCount
	if shown > maxVisible {
		shown = maxVisible
	}
	// top padding(1) + Title/Esc(1) + Search box(3) + NewSession(1) + sessions + shortcuts(2)
	h := 1 + 1 + 3 + 1 + shown + 2
	return w, h
}

// ── Renderer ──────────────────────────────────────────────────────────────────

// RenderSessionsModal renders the sessions picker.
func RenderSessionsModal(m SessionsModal, termW, termH int) string {
	filtered := m.Filtered()
	modalW, _ := sessionModalDims(termW, len(filtered))
	innerW := modalW - 4
	if innerW < 20 {
		innerW = 20
	}

	dimText := lipgloss.NewStyle().Foreground(ColorDimGray)
	whiteBold := lipgloss.NewStyle().Foreground(ColorWhite).Bold(true)
	orange := lipgloss.Color("#FF8C00") // Open Code orange
	orangeCursor := lipgloss.NewStyle().Background(orange).Foreground(ColorBlack).Bold(true)
	activeRow := lipgloss.NewStyle().Background(orange).Foreground(ColorBlack).Width(innerW)

	// ── Title row ─────────────────────────────────────────────────────────────
	titleLeft := whiteBold.Render("Sessions")
	hintRight := dimText.Render("esc")
	gap := innerW - lipgloss.Width(titleLeft) - lipgloss.Width(hintRight)
	if gap < 1 {
		gap = 1
	}
	titleRow := "  " + titleLeft + strings.Repeat(" ", gap) + hintRight

	// ── Search row ────────────────────────────────────────────────────────────
	runes := []rune(m.SearchQuery)
	var searchBefore, searchAfter string
	var cursorStr string
	if m.SearchCursor < len(runes) {
		searchBefore = string(runes[:m.SearchCursor])
		cursorStr = string(runes[m.SearchCursor])
		searchAfter = string(runes[m.SearchCursor+1:])
	} else {
		searchBefore = string(runes)
		cursorStr = " "
		searchAfter = ""
	}
	searchInput := searchBefore + orangeCursor.Render(cursorStr) + searchAfter
	searchBox := lipgloss.NewStyle().
		Background(lipgloss.Color("#1a1a1a")).
		Padding(1, 2).
		Width(innerW).
		Render(dimText.Render("Search ") + searchInput)
	searchLine := searchBox

	// ── "New Session" row ─────────────────────────────────────────────────────
	var newRow string
	if m.IsNewSelected() {
		newRow = activeRow.Render("  + New Session")
	} else {
		newRow = dimText.Render("  + New Session")
	}

	// ── Session list (capped + scrolled) ──────────────────────────────────────
	end := m.ScrollOffset + maxVisible
	if end > len(filtered) {
		end = len(filtered)
	}
	visible := filtered[m.ScrollOffset:end]

	var sessionRows []string
	for i, s := range visible {
		absIdx := m.ScrollOffset + i
		cursorIdx := absIdx + 1
		active := m.Cursor == cursorIdx

		// Right side: "2h ago"
		timeStr := sessions.FormatRelativeTime(s.UpdatedAt)
		rightW := lipgloss.Width(timeStr)
		
		maxNameW := innerW - rightW - 6
		if maxNameW < 8 {
			maxNameW = 8
		}
		
		name := truncate(s.Name, maxNameW)
		pinIcon := ""
		if s.Pinned {
			pinIcon = "📌 "
		}
		
		nameW := lipgloss.Width(name) + lipgloss.Width(pinIcon)
		spaces := innerW - nameW - rightW - 2
		if spaces < 1 {
			spaces = 1
		}

		var row string
		if active {
			// Plain text first, then activeRow on the whole thing
			plain := "  " + pinIcon + name + strings.Repeat(" ", spaces) + timeStr
			row = activeRow.Render(plain)
		} else {
			leftStyled := lipgloss.NewStyle().Foreground(ColorWhite).Render(name)
			right := dimText.Render(timeStr)
			row = "  " + pinIcon + leftStyled + strings.Repeat(" ", spaces) + right
		}
		sessionRows = append(sessionRows, row)
	}

	if len(filtered) == 0 {
		sessionRows = append(sessionRows, dimText.Render("   No sessions found."))
	}

	// ── Shortcuts row ─────────────────────────────────────────────────────────
	shortcuts := dimText.Render("  pin/unpin ") + whiteBold.Render("ctrl+f") +
		dimText.Render("   delete ") + whiteBold.Render("ctrl+d") +
		dimText.Render("   rename ") + whiteBold.Render("ctrl+r")

	// ── Assemble content ──────────────────────────────────────────────────────
	listStr := strings.Join(sessionRows, "\n")
	content := strings.Join([]string{
		titleRow,
		"", // gap
		searchLine,
		newRow,
		listStr,
		"", // gap
		shortcuts,
	}, "\n")

	modal := lipgloss.NewStyle().
		Background(lipgloss.Color("#0a0a0a")).
		PaddingTop(1).PaddingBottom(1).
		Width(modalW).
		Render(content)

	return modal
}

// truncate shortens s to at most maxW rune columns, appending "…" if cut.
func truncate(s string, maxW int) string {
	runes := []rune(s)
	if len(runes) <= maxW {
		return s
	}
	if maxW <= 1 {
		return "…"
	}
	return string(runes[:maxW-1]) + "…"
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
