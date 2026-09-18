package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

func TestProjectsFileContentHandlerEnforcesProjectRoot(t *testing.T) {
	projectRoot := t.TempDir()
	insidePath := filepath.Join(projectRoot, "src", "main.go")
	if err := os.MkdirAll(filepath.Dir(insidePath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(insidePath, []byte("package main\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	siblingRoot := projectRoot + "-sibling"
	if err := os.MkdirAll(siblingRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	siblingPath := filepath.Join(siblingRoot, "secret.txt")
	if err := os.WriteFile(siblingPath, []byte("secret"), 0o600); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name       string
		root       string
		path       string
		wantStatus int
		wantBody   string
	}{
		{
			name:       "reads file inside project",
			root:       projectRoot,
			path:       insidePath,
			wantStatus: http.StatusOK,
			wantBody:   "package main\n",
		},
		{
			name:       "requires project root",
			path:       insidePath,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "rejects sibling path with shared prefix",
			root:       projectRoot,
			path:       siblingPath,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "rejects directory",
			root:       projectRoot,
			path:       filepath.Dir(insidePath),
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := url.Values{}
			query.Set("path", tt.path)
			if tt.root != "" {
				query.Set("root", tt.root)
			}

			req := httptest.NewRequest(http.MethodGet, "/v1/projects/file-content?"+query.Encode(), nil)
			recorder := httptest.NewRecorder()
			projectsFileContentHandler(recorder, req)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantBody == "" {
				return
			}

			var response struct {
				Content string `json:"content"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if response.Content != tt.wantBody {
				t.Fatalf("content = %q, want %q", response.Content, tt.wantBody)
			}
		})
	}
}
