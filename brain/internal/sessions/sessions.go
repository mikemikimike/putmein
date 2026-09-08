package sessions

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SessionsDir is where all session JSON files live.
// Brain stores its sessions separately at ~/.brain/sessions/
var SessionsDir = filepath.Join(os.Getenv("HOME"), ".brain", "sessions")

// SessionMessage is a single message in a session.
type SessionMessage struct {
	Role      string `json:"role"`      // "user" | "assistant" | "terminal" | "system"
	Content   string `json:"content"`
	Thinking  string `json:"thinking,omitempty"`
	Timestamp string `json:"timestamp"`
}

// Session is a conversation thread.
type Session struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	CreatedAt string           `json:"createdAt"`
	UpdatedAt string           `json:"updatedAt"`
	Pinned    bool             `json:"pinned,omitempty"`
	ModelID   string           `json:"modelId,omitempty"`
	Messages  []SessionMessage `json:"messages"`
}

// EnsureDir creates the sessions directory if it doesn't exist.
func EnsureDir() error {
	return os.MkdirAll(SessionsDir, 0755)
}

// List returns all sessions sorted: pinned first, then most-recently-updated.
func List() ([]Session, error) {
	if err := EnsureDir(); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(SessionsDir)
	if err != nil {
		return nil, err
	}
	var sessions []Session
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		s, err := Load(strings.TrimSuffix(e.Name(), ".json"))
		if err != nil {
			continue
		}
		sessions = append(sessions, *s)
	}
	sort.Slice(sessions, func(i, j int) bool {
		if sessions[i].Pinned != sessions[j].Pinned {
			return sessions[i].Pinned
		}
		ti, _ := time.Parse(time.RFC3339, sessions[i].UpdatedAt)
		tj, _ := time.Parse(time.RFC3339, sessions[j].UpdatedAt)
		return ti.After(tj)
	})
	return sessions, nil
}

// Load reads a session by ID.
func Load(id string) (*Session, error) {
	p := filepath.Join(SessionsDir, id+".json")
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var s Session
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

// Save persists a session to disk.
func Save(s *Session) error {
	if err := EnsureDir(); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(SessionsDir, s.ID+".json"), data, 0644)
}

// Create builds a new empty session.
func Create(name, modelID string) *Session {
	if name == "" {
		name = fmt.Sprintf("Session: %s", time.Now().Format("Jan 2, 3:04 PM"))
	}
	now := time.Now().UTC().Format(time.RFC3339)
	return &Session{
		ID:        uuid.New().String(),
		Name:      name,
		ModelID:   modelID,
		CreatedAt: now,
		UpdatedAt: now,
		Messages:  []SessionMessage{},
	}
}

// AddMessage appends a message to the session and updates UpdatedAt.
func AddMessage(s *Session, msg SessionMessage) *Session {
	updated := *s
	if msg.Timestamp == "" {
		msg.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}
	updated.Messages = append(updated.Messages, msg)
	updated.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return &updated
}

// Rename changes a session's name.
func Rename(s *Session, name string) *Session {
	updated := *s
	updated.Name = name
	updated.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return &updated
}

// TogglePin toggles a session's pinned status.
func TogglePin(s *Session) *Session {
	updated := *s
	updated.Pinned = !updated.Pinned
	updated.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	return &updated
}

// Delete removes a session file.
func Delete(id string) error {
	return os.Remove(filepath.Join(SessionsDir, id+".json"))
}

// Summary returns a short summary of the first user message.
func Summary(s *Session) string {
	for _, m := range s.Messages {
		if m.Role == "user" {
			if len(m.Content) > 60 {
				return m.Content[:57] + "…"
			}
			return m.Content
		}
	}
	return "Empty session"
}

// FormatRelativeTime returns a human-readable relative timestamp.
func FormatRelativeTime(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	diff := time.Since(t)
	mins := int(diff.Minutes())
	hrs := int(diff.Hours())
	days := int(diff.Hours() / 24)
	switch {
	case mins < 1:
		return "just now"
	case mins < 60:
		return fmt.Sprintf("%dm ago", mins)
	case hrs < 24:
		return fmt.Sprintf("%dh ago", hrs)
	case days < 7:
		return fmt.Sprintf("%dd ago", days)
	default:
		return t.Format("Jan 2")
	}
}
