package agent

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// agentRoot is the optional root directory that restricts file access.
// If empty, full filesystem access is allowed (with permission prompts).
var agentRoot string

func init() {
	agentRoot = os.Getenv("AGENT_ROOT")
	if agentRoot != "" {
		// Expand ~ to home dir
		if strings.HasPrefix(agentRoot, "~/") {
			home, _ := os.UserHomeDir()
			agentRoot = filepath.Join(home, agentRoot[2:])
		}
		// Resolve to absolute path
		abs, err := filepath.Abs(agentRoot)
		if err == nil {
			agentRoot = abs
		}
	}
}

// safePath validates and resolves a path, ensuring it does not escape agentRoot.
// If agentRoot is empty, any path is allowed.
func safePath(p string) (string, error) {
	if p == "" {
		return "", fmt.Errorf("path cannot be empty")
	}

	// Expand home dir shorthand
	if strings.HasPrefix(p, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		p = filepath.Join(home, p[2:])
	}

	abs, err := filepath.Abs(p)
	if err != nil {
		return "", err
	}

	if agentRoot != "" {
		// Ensure the resolved path is inside agentRoot
		rel, err := filepath.Rel(agentRoot, abs)
		if err != nil || strings.HasPrefix(rel, "..") {
			return "", fmt.Errorf("path %q is outside the allowed root %q", abs, agentRoot)
		}
	}

	return abs, nil
}

// ReadFile reads the contents of a file.
func ReadFile(path string) (string, error) {
	safe, err := safePath(path)
	if err != nil {
		return "", err
	}

	data, err := os.ReadFile(safe)
	if err != nil {
		return "", fmt.Errorf("read_file: %w", err)
	}

	return string(data), nil
}

// WriteFile writes content to a file, creating parent directories as needed.
func WriteFile(path, content string) error {
	safe, err := safePath(path)
	if err != nil {
		return err
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(safe), 0755); err != nil {
		return fmt.Errorf("write_file mkdir: %w", err)
	}

	return os.WriteFile(safe, []byte(content), 0644)
}

// ListDir returns a simple listing of a directory's contents.
func ListDir(path string) (string, error) {
	safe, err := safePath(path)
	if err != nil {
		return "", err
	}

	entries, err := os.ReadDir(safe)
	if err != nil {
		return "", fmt.Errorf("list_dir: %w", err)
	}

	if len(entries) == 0 {
		return "(empty directory)", nil
	}

	var sb strings.Builder
	for _, e := range entries {
		if e.IsDir() {
			sb.WriteString("d  " + e.Name() + "/\n")
		} else {
			info, _ := e.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			sb.WriteString(fmt.Sprintf("f  %-40s  %d bytes\n", e.Name(), size))
		}
	}
	return sb.String(), nil
}

// CreateDir creates a directory (and all parents) at the given path.
func CreateDir(path string) error {
	safe, err := safePath(path)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(safe, 0755); err != nil {
		return fmt.Errorf("create_dir: %w", err)
	}
	return nil
}

// DeleteFile removes a single file (not a directory).
func DeleteFile(path string) error {
	safe, err := safePath(path)
	if err != nil {
		return err
	}

	info, err := os.Stat(safe)
	if err != nil {
		return fmt.Errorf("delete_file: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("delete_file: %q is a directory, use exec rm -rf with caution", safe)
	}

	return os.Remove(safe)
}
