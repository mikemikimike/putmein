package api

import (
	"encoding/json"
	"net/http"

	"brain/server/internal/security"
)

// securityScanHandler handles POST /v1/security/scan
func securityScanHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req security.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON request body", http.StatusBadRequest)
		return
	}

	if req.ProjectName == "" || req.ProjectPath == "" {
		http.Error(w, "projectName and projectPath are required", http.StatusBadRequest)
		return
	}

	report, err := security.DefaultService().ScanProject(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":     true,
		"report": report,
	})
}

// securityRulesHandler handles GET /v1/security/rules
func securityRulesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"rules": security.PredefinedRules,
		"count": len(security.PredefinedRules),
	})
}

// securityScansHandler handles GET /v1/security/scans
func securityScansHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	scans := security.DefaultService().ListRecentScans()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"scans": scans,
		"count": len(scans),
	})
}
