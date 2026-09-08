package agent

import (
	"sync"

	"github.com/google/uuid"
)

// ApprovalManager holds pending approval channels keyed by a unique request ID.
// The chat SSE handler creates an entry, blocks on the channel, and the
// POST /v1/chat/approve endpoint resolves it.
type ApprovalManager struct {
	mu      sync.Mutex
	pending map[string]chan bool
}

var Approvals = &ApprovalManager{
	pending: make(map[string]chan bool),
}

// NewRequest registers a new approval request and returns (id, channel).
// The caller should block on the channel, then call Release when done.
func (a *ApprovalManager) NewRequest() (string, <-chan bool) {
	id := uuid.New().String()
	ch := make(chan bool, 1)
	a.mu.Lock()
	a.pending[id] = ch
	a.mu.Unlock()
	return id, ch
}

// Respond sends the user's decision to the waiting request.
// Returns false if no such request is pending.
func (a *ApprovalManager) Respond(id string, approved bool) bool {
	a.mu.Lock()
	ch, ok := a.pending[id]
	if ok {
		delete(a.pending, id)
	}
	a.mu.Unlock()
	if !ok {
		return false
	}
	ch <- approved
	return true
}

// Release removes a pending request without answering it (cleanup on timeout/cancel).
func (a *ApprovalManager) Release(id string) {
	a.mu.Lock()
	delete(a.pending, id)
	a.mu.Unlock()
}

// NewApprovalID generates a fresh UUID for use where uuid is not imported.
func NewApprovalID() string {
	return uuid.New().String()
}
