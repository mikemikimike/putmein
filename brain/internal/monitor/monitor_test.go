package monitor

import "testing"

func TestUpdateProjectMutatesStateUnderServiceLock(t *testing.T) {
	service := &Service{projects: make(map[string]*projectState)}
	service.projects["project-1"] = &projectState{
		project: &Project{ID: "project-1", Enabled: true, IntervalSec: 30, Status: StatusActive},
	}
	enabled := false
	interval := 60
	status := StatusPaused

	service.UpdateProject("project-1", &enabled, &interval, &status)

	project := service.projects["project-1"].project
	if project.Enabled || project.IntervalSec != 60 || project.Status != StatusPaused {
		t.Fatalf("unexpected project state after update: %+v", project)
	}
}

func TestPauseProjectKeepsServiceLockWhileStoppingProject(t *testing.T) {
	service := &Service{projects: make(map[string]*projectState)}
	cancelStarted := make(chan struct{})
	allowCancelToReturn := make(chan struct{})
	service.projects["project-1"] = &projectState{
		project: &Project{ID: "project-1", Status: StatusActive},
		cancel: func() {
			close(cancelStarted)
			<-allowCancelToReturn
		},
	}

	pauseDone := make(chan struct{})
	go func() {
		service.PauseProject("project-1")
		close(pauseDone)
	}()

	<-cancelStarted
	updateDone := make(chan struct{})
	go func() {
		enabled := false
		service.UpdateProject("project-1", &enabled, nil, nil)
		close(updateDone)
	}()

	select {
	case <-updateDone:
		t.Fatal("UpdateProject ran while PauseProject was still stopping the project")
	default:
	}

	close(allowCancelToReturn)
	<-pauseDone
	<-updateDone

	state := service.projects["project-1"]
	if state.cancel != nil || state.project.Status != StatusPaused {
		t.Fatalf("unexpected project state after pause: %+v", state.project)
	}
}
