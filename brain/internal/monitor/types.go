package monitor

import (
	"sync"
	"time"
)

// Severity levels for alerts.
type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityWarn     Severity = "warn"
	SeverityError    Severity = "error"
	SeverityCritical Severity = "critical"
)

// ProjectStatus tracks the lifecycle of a monitored project.
type ProjectStatus string

const (
	StatusDiscovering ProjectStatus = "discovering"
	StatusActive      ProjectStatus = "active"
	StatusPaused      ProjectStatus = "paused"
	StatusError       ProjectStatus = "error"
)

// Project holds a monitored project's configuration.
type Project struct {
	ID             string        `json:"id"`
	UserID         string        `json:"userId"`
	Name           string        `json:"name"`
	ProjectPath    string        `json:"projectPath"`
	LogPaths       []string      `json:"logPaths"`
	LogCommand     string        `json:"logCommand,omitempty"`
	RunCommand     string        `json:"runCommand,omitempty"`
	IntervalSec    int           `json:"intervalSec"`
	Enabled        bool          `json:"enabled"`
	Status         ProjectStatus `json:"status"`
	Memory         string        `json:"memory,omitempty"`
	MemoryStatus   string        `json:"memoryStatus,omitempty"`
	ProjectUrl     string        `json:"projectUrl,omitempty"`
	ManagedPid     int           `json:"managedPid,omitempty"`
	ManagedLogFile string        `json:"managedLogFile,omitempty"`
	LastChecked    *time.Time    `json:"lastChecked,omitempty"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// Alert is produced when the AI detects something wrong in a log chunk.
type Alert struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Severity  Severity  `json:"severity"`
	Message   string    `json:"message"`
	RawLog    string    `json:"rawLog"`
	Dismissed bool      `json:"dismissed"`
	CreatedAt time.Time `json:"createdAt"`

	// ProjectName is populated when broadcasting (for UI display).
	ProjectName string `json:"projectName,omitempty"`
}

// AlertSubscriber is a channel that receives real-time alert broadcasts.
type AlertSubscriber chan *Alert

// Broker manages fan-out of alerts to all SSE subscribers.
type Broker struct {
	mu          sync.Mutex
	subscribers map[AlertSubscriber]struct{}
}

func newBroker() *Broker {
	return &Broker{subscribers: make(map[AlertSubscriber]struct{})}
}

// Subscribe registers a new subscriber channel.
func (b *Broker) Subscribe() AlertSubscriber {
	ch := make(AlertSubscriber, 16)
	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

// Unsubscribe removes and closes a subscriber channel.
func (b *Broker) Unsubscribe(ch AlertSubscriber) {
	b.mu.Lock()
	delete(b.subscribers, ch)
	b.mu.Unlock()
	close(ch)
}

// Broadcast fans-out an alert to all subscribers (non-blocking).
func (b *Broker) Broadcast(a *Alert) {
	b.mu.Lock()
	for ch := range b.subscribers {
		select {
		case ch <- a:
		default: // drop if subscriber is slow
		}
	}
	b.mu.Unlock()
}
