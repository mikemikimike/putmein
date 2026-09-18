package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireInternalSecret(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	handler := requireInternalSecret(next)

	tests := []struct {
		name       string
		configured string
		header     string
		value      string
		wantStatus int
	}{
		{name: "missing configuration", wantStatus: http.StatusInternalServerError},
		{name: "missing secret", configured: "correct-secret", wantStatus: http.StatusUnauthorized},
		{name: "wrong secret", configured: "correct-secret", header: "x-brain-secret", value: "wrong-secret", wantStatus: http.StatusUnauthorized},
		{name: "brain secret", configured: "correct-secret", header: "x-brain-secret", value: "correct-secret", wantStatus: http.StatusNoContent},
		{name: "internal secret alias", configured: "correct-secret", header: "x-internal-secret", value: "correct-secret", wantStatus: http.StatusNoContent},
		{name: "bearer token", configured: "correct-secret", header: "Authorization", value: "Bearer correct-secret", wantStatus: http.StatusNoContent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("BRAIN_INTERNAL_SECRET", tt.configured)
			req := httptest.NewRequest(http.MethodGet, "/v1/protected", nil)
			if tt.header != "" {
				req.Header.Set(tt.header, tt.value)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)
			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rec.Code)
			}
		})
	}
}

func TestProtectedRoutesRequireInternalSecret(t *testing.T) {
	t.Setenv("BRAIN_INTERNAL_SECRET", "correct-secret")
	router := NewRouter()

	for _, path := range []string{
		"/v1/deploy",
		"/v1/deploy/logs?container=test",
		"/v1/deploy/action",
		"/v1/containers",
		"/v1/containers/test",
		"/v1/containers/test/logs",
		"/v1/containers/test/restart",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s returned status %d, want %d", path, rec.Code, http.StatusUnauthorized)
		}
	}
}
