package agent

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"brain/server/internal/ai"
)

// autonomousMode controls whether the agent asks for permission before running tools.
// When false: each tool call emits a permission request and waits.
// When true: tools run immediately without asking.
var (
	autonomousMu    sync.RWMutex
	autonomousMode  bool
	deploymentsPath string
	savedApiKeys    = make(map[string]string)
)

// settingsPath returns the path to the persistent settings file.
// Prioritizes ~/.config/putmein/settings.json across all platforms.
func settingsPath() string {
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		p := filepath.Join(home, ".config", "putmein", "settings.json")
		if _, err := os.Stat(p); err == nil {
			return p
		}
		// Also check user config dir if it exists
		if dir, err := os.UserConfigDir(); err == nil && dir != "" {
			alt := filepath.Join(dir, "putmein", "settings.json")
			if _, err := os.Stat(alt); err == nil {
				return alt
			}
		}
		return p
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = os.TempDir()
	}
	return filepath.Join(dir, "putmein", "settings.json")
}

type persistedSettings struct {
	AutonomousMode  bool              `json:"autonomousMode"`
	DeploymentsPath string            `json:"deploymentsPath,omitempty"`
	ApiKeys         map[string]string `json:"apiKeys,omitempty"`
}

// DefaultDeploymentsDir returns the default OS-dependent common deployment location.
// On macOS/Linux: ~/.ray/deployments
// On Windows: %USERPROFILE%\.ray\deployments
func DefaultDeploymentsDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = os.TempDir()
	}
	return filepath.Join(home, ".ray", "deployments")
}

// loadSettings reads autonomous mode, deploymentsPath and apiKeys from disk. Called once on package init.
func loadSettings() {
	data, err := os.ReadFile(settingsPath())
	if err != nil {
		// File may not exist yet, that's fine, default is false
		return
	}
	var s persistedSettings
	if json.Unmarshal(data, &s) == nil {
		autonomousMode = s.AutonomousMode
		deploymentsPath = s.DeploymentsPath
		if s.ApiKeys != nil {
			savedApiKeys = make(map[string]string)
			for k, v := range s.ApiKeys {
				trimmed := strings.TrimSpace(v)
				if trimmed != "" {
					savedApiKeys[k] = trimmed
					ai.SetRuntimeAPIKey(k, trimmed)
					if k == "ozias" {
						ai.SetRuntimeAPIKey("minimax", trimmed)
					} else if k == "minimax" {
						ai.SetRuntimeAPIKey("ozias", trimmed)
					}
				}
			}
		}
	}
}

// saveSettings writes the current state to disk. Called after every change.
func saveSettings() {
	path := settingsPath()
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	s := persistedSettings{
		AutonomousMode:  autonomousMode,
		DeploymentsPath: deploymentsPath,
		ApiKeys:         savedApiKeys,
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(path, data, 0o644)
}

func init() {
	loadSettings()
}

// SetAPIKeys updates multiple provider API keys in memory and persists them.
func SetAPIKeys(keys map[string]string) {
	autonomousMu.Lock()
	defer autonomousMu.Unlock()

	if savedApiKeys == nil {
		savedApiKeys = make(map[string]string)
	}

	for provider, key := range keys {
		trimmed := strings.TrimSpace(key)
		if trimmed != "" {
			savedApiKeys[provider] = trimmed
			ai.SetRuntimeAPIKey(provider, trimmed)
			if provider == "ozias" {
				savedApiKeys["minimax"] = trimmed
				ai.SetRuntimeAPIKey("minimax", trimmed)
			} else if provider == "minimax" {
				savedApiKeys["ozias"] = trimmed
				ai.SetRuntimeAPIKey("ozias", trimmed)
			}
		}
	}
	saveSettings()
}

// RemoveAPIKey deletes a provider key from memory and persists the change to disk.
func RemoveAPIKey(provider string) {
	autonomousMu.Lock()
	defer autonomousMu.Unlock()

	if savedApiKeys != nil {
		delete(savedApiKeys, provider)
		ai.SetRuntimeAPIKey(provider, "")
		if provider == "ozias" {
			delete(savedApiKeys, "minimax")
			ai.SetRuntimeAPIKey("minimax", "")
		} else if provider == "minimax" {
			delete(savedApiKeys, "ozias")
			ai.SetRuntimeAPIKey("ozias", "")
		}
	}
	saveSettings()
}

// GetSavedAPIKeys returns a copy of the saved API keys map.
func GetSavedAPIKeys() map[string]string {
	autonomousMu.RLock()
	defer autonomousMu.RUnlock()

	res := make(map[string]string, len(savedApiKeys))
	for k, v := range savedApiKeys {
		res[k] = v
	}
	return res
}

// SetAutonomousMode enables or disables autonomous mode globally and persists the change.
func SetAutonomousMode(enabled bool) {
	autonomousMu.Lock()
	defer autonomousMu.Unlock()
	autonomousMode = enabled
	saveSettings()
}

// IsAutonomousMode returns the current autonomous mode state.
func IsAutonomousMode() bool {
	autonomousMu.RLock()
	defer autonomousMu.RUnlock()
	return autonomousMode
}

// GetDeploymentsDir returns the configured deployments directory or default, creating it if needed.
func GetDeploymentsDir() string {
	autonomousMu.RLock()
	target := deploymentsPath
	autonomousMu.RUnlock()

	if target == "" {
		target = DefaultDeploymentsDir()
	}

	// Expand ~ if present
	if len(target) > 0 && target[0] == '~' {
		if home, err := os.UserHomeDir(); err == nil {
			target = filepath.Join(home, target[1:])
		}
	}

	_ = os.MkdirAll(target, 0o755)
	return target
}

// SetDeploymentsDir updates the custom deployments directory and persists it.
func SetDeploymentsDir(path string) {
	autonomousMu.Lock()
	deploymentsPath = path
	saveSettings()
	autonomousMu.Unlock()

	_ = os.MkdirAll(GetDeploymentsDir(), 0o755)
}

// PermissionRequest describes a tool call that needs user approval.
type PermissionRequest struct {
	ToolName    string `json:"toolName"`
	Description string `json:"description"`
	// Args is the human-readable summary of what will be executed.
	Args string `json:"args"`
}

// PermissionResponse is the user's answer to a permission request.
type PermissionResponse struct {
	// Approved is true if the user clicked Allow / typed yes.
	Approved bool `json:"approved"`
	// AlwaysAllow permanently enables autonomous mode for this session.
	AlwaysAllow bool `json:"alwaysAllow"`
}
