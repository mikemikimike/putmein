package monitor

import (
	"testing"
)

func TestLogPathsSnapshotIsIndependentOfProject(t *testing.T) {
	service := &Service{}
	ps := &projectState{project: &Project{LogPaths: []string{"first.log"}}}

	snapshot := service.logPathsSnapshot(ps)
	ps.project.LogPaths[0] = "changed.log"
	ps.project.LogPaths = append(ps.project.LogPaths, "second.log")

	if len(snapshot) != 1 || snapshot[0] != "first.log" {
		t.Fatalf("snapshot changed with project paths: %v", snapshot)
	}
}

func TestLogPathsSnapshotCanRunConcurrentlyWithAddLogPath(t *testing.T) {
	service := &Service{projects: make(map[string]*projectState)}
	ps := &projectState{project: &Project{ID: "race-test", LogPaths: []string{"first.log"}}}
	service.projects[ps.project.ID] = ps

	done := make(chan struct{})
	go func() {
		defer close(done)
		for i := 0; i < 1000; i++ {
			service.AddLogPath(ps.project.ID, "log-"+string(rune(i)))
		}
	}()

	for i := 0; i < 1000; i++ {
		_ = service.logPathsSnapshot(ps)
	}
	<-done
}
