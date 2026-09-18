package monitor

import (
	"testing"
	"time"
)

func TestGetManagedProcessReturnsSnapshot(t *testing.T) {
	const projectID = "snapshot-test"
	managedMu.Lock()
	managed[projectID] = &ManagedProcess{
		ProjectID:   projectID,
		ProjectPath: "/tmp/project",
		PID:         1234,
		Port:        3000,
		URL:         "http://localhost:3000",
		StartedAt:   time.Now(),
	}
	managedMu.Unlock()
	t.Cleanup(func() {
		managedMu.Lock()
		delete(managed, projectID)
		managedMu.Unlock()
	})

	got := GetManagedProcess(projectID)
	if got == nil {
		t.Fatal("GetManagedProcess() returned nil")
	}

	managedMu.Lock()
	original := managed[projectID]
	managedMu.Unlock()
	if got == original {
		t.Fatal("GetManagedProcess() returned the shared process pointer")
	}

	managedMu.Lock()
	original.Port = 4000
	original.URL = "http://localhost:4000"
	managedMu.Unlock()
	if got.Port != 3000 || got.URL != "http://localhost:3000" {
		t.Fatalf("snapshot changed after managed process mutation: port=%d url=%q", got.Port, got.URL)
	}
}
