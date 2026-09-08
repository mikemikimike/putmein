package api

import (
	"encoding/json"
	"net/http"

	"brain/server/internal/deploy"
)

// portsHandler handles GET /v1/ports — returns live occupied and available ports across projects, containers, and system.
func portsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claimedMap, err := deploy.GetUsedPortsMap()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type portEntry struct {
		Port int    `json:"port"`
		Name string `json:"name"`
	}

	var claimedList []portEntry
	for port, name := range claimedMap {
		claimedList = append(claimedList, portEntry{
			Port: port,
			Name: name,
		})
	}

	nextFree, _ := deploy.FindGuaranteedFreePort(0, "")

	var suggested []int
	candidate := nextFree
	for len(suggested) < 5 && candidate < 6000 {
		if p, err := deploy.FindGuaranteedFreePort(candidate, ""); err == nil {
			if len(suggested) == 0 || p > suggested[len(suggested)-1] {
				suggested = append(suggested, p)
			}
			candidate = p + 1
		} else {
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"claimed":        claimedList,
		"reserved":       deploy.ReservedPorts,
		"nextFreePort":   nextFree,
		"suggestedPorts": suggested,
	})
}
