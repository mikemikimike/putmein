package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSMiddleware(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	handler := corsMiddleware(dummyHandler)

	// 1. Allowed origin GET
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("expected Access-Control-Allow-Origin to be 'http://localhost:3000', got %q", got)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Fatalf("expected Vary to be 'Origin', got %q", got)
	}

	// 2. Disallowed origin GET
	req = httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("Origin", "http://evil.com")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected no Access-Control-Allow-Origin for evil.com, got %q", got)
	}

	// 3. Allowed origin OPTIONS preflight
	req = httptest.NewRequest(http.MethodOptions, "/v1/models", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 for allowed preflight, got %d", rec.Code)
	}

	// 4. Disallowed origin OPTIONS preflight
	req = httptest.NewRequest(http.MethodOptions, "/v1/models", nil)
	req.Header.Set("Origin", "http://evil.com")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for disallowed preflight, got %d", rec.Code)
	}
}
