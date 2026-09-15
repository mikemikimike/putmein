package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

type terminalExecRequest struct {
	Command     string `json:"command"`
	Cwd         string `json:"cwd,omitempty"`
	ContainerID string `json:"containerId,omitempty"`
}

type terminalExecResponse struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
	Cwd      string `json:"cwd"`
	User     string `json:"user"`
	Host     string `json:"host"`
}

type terminalStreamWriter struct {
	onProgress func(string)
}

func (tsw *terminalStreamWriter) Write(p []byte) (n int, err error) {
	if tsw.onProgress != nil && len(p) > 0 {
		tsw.onProgress(string(p))
	}
	return len(p), nil
}

// resolveDefaultRoot returns the host user's home directory (~), or "/" if home is not available.
// It explicitly avoids defaulting to PutmeIn/brain or PutmeIn/ray codebase roots.
func resolveDefaultRoot() string {
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return home
	}
	return "/"
}

var validContainerRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.-]*$`)

func isValidContainerTarget(target string) bool {
	return validContainerRegex.MatchString(target)
}

func sanitizeCwd(cwd string) string {
	targetCwd := strings.TrimSpace(cwd)
	if targetCwd == "" {
		return resolveDefaultRoot()
	}
	cleaned := filepath.Clean(targetCwd)
	if info, err := os.Stat(cleaned); err == nil && info.IsDir() {
		return cleaned
	}
	return resolveDefaultRoot()
}

func getSystemUserAndHost() (string, string) {
	sysUser := "user"
	if u, err := user.Current(); err == nil && u.Username != "" {
		sysUser = u.Username
	}
	sysHost := "localhost"
	if h, err := os.Hostname(); err == nil && h != "" {
		sysHost = h
	}
	return sysUser, sysHost
}

// terminalExecHandler executes a command and returns the JSON result.
// POST /v1/terminal/exec
func terminalExecHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req terminalExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	trimmedCmd := strings.TrimSpace(req.Command)
	sysUser, sysHost := getSystemUserAndHost()

	if req.ContainerID != "" && !isValidContainerTarget(strings.TrimSpace(req.ContainerID)) {
		http.Error(w, "invalid container identifier", http.StatusBadRequest)
		return
	}

	targetCwd := sanitizeCwd(req.Cwd)

	// If empty command, just return current prompt context
	if trimmedCmd == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(terminalExecResponse{
			Stdout:   "",
			Stderr:   "",
			ExitCode: 0,
			Cwd:      targetCwd,
			User:     sysUser,
			Host:     sysHost,
		})
		return
	}

	// If executing on host, handle directory changes ("cd")
	if req.ContainerID == "" {
		parts := strings.Fields(trimmedCmd)
		if len(parts) >= 1 && parts[0] == "cd" {
			newDir := ""
			if len(parts) == 1 || parts[1] == "~" {
				newDir = resolveDefaultRoot()
			} else {
				dest := parts[1]
				if strings.HasPrefix(dest, "~/") {
					dest = filepath.Join(resolveDefaultRoot(), dest[2:])
				} else if !filepath.IsAbs(dest) {
					dest = filepath.Join(targetCwd, dest)
				}
				newDir = filepath.Clean(dest)
			}

			if info, err := os.Stat(newDir); err == nil && info.IsDir() {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(terminalExecResponse{
					Stdout:   "",
					Stderr:   "",
					ExitCode: 0,
					Cwd:      newDir,
					User:     sysUser,
					Host:     sysHost,
				})
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(terminalExecResponse{
				Stdout:   "",
				Stderr:   fmt.Sprintf("cd: no such file or directory: %s\n", parts[1]),
				ExitCode: 1,
				Cwd:      targetCwd,
				User:     sysUser,
				Host:     sysHost,
			})
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	if req.ContainerID != "" {
		// Execute command directly inside the specified Docker container
		containerTarget := strings.TrimSpace(req.ContainerID)
		cmd = exec.CommandContext(ctx, "docker", "exec", "-i", containerTarget, "sh", "-c", trimmedCmd)
	} else {
		// Execute command on host system
		switch runtime.GOOS {
		case "windows":
			cmd = exec.CommandContext(ctx, "cmd", "/C", trimmedCmd)
		default:
			cmd = exec.CommandContext(ctx, "sh", "-c", trimmedCmd)
		}
		cmd.Dir = targetCwd
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(terminalExecResponse{
		Stdout:   stdoutBuf.String(),
		Stderr:   stderrBuf.String(),
		ExitCode: exitCode,
		Cwd:      targetCwd,
		User:     sysUser,
		Host:     sysHost,
	})
}

// terminalStreamHandler executes a command and streams output live via SSE.
// POST /v1/terminal/stream
func terminalStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req terminalExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	trimmedCmd := strings.TrimSpace(req.Command)
	sysUser, sysHost := getSystemUserAndHost()

	if req.ContainerID != "" && !isValidContainerTarget(strings.TrimSpace(req.ContainerID)) {
		http.Error(w, "invalid container identifier", http.StatusBadRequest)
		return
	}

	targetCwd := sanitizeCwd(req.Cwd)

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flushSSE(w)

	// If empty command, emit immediate done
	if trimmedCmd == "" {
		doneEv, _ := json.Marshal(map[string]any{
			"type":     "done",
			"exitCode": 0,
			"cwd":      targetCwd,
			"user":     sysUser,
			"host":     sysHost,
		})
		w.Write([]byte("data: " + string(doneEv) + "\n\n"))
		flushSSE(w)
		return
	}

	// Handle cd command
	if req.ContainerID == "" {
		parts := strings.Fields(trimmedCmd)
		if len(parts) >= 1 && parts[0] == "cd" {
			newDir := ""
			if len(parts) == 1 || parts[1] == "~" {
				newDir = resolveDefaultRoot()
			} else {
				dest := parts[1]
				if strings.HasPrefix(dest, "~/") {
					dest = filepath.Join(resolveDefaultRoot(), dest[2:])
				} else if !filepath.IsAbs(dest) {
					dest = filepath.Join(targetCwd, dest)
				}
				newDir = filepath.Clean(dest)
			}

			if info, err := os.Stat(newDir); err == nil && info.IsDir() {
				doneEv, _ := json.Marshal(map[string]any{
					"type":     "done",
					"exitCode": 0,
					"cwd":      newDir,
					"user":     sysUser,
					"host":     sysHost,
				})
				w.Write([]byte("data: " + string(doneEv) + "\n\n"))
				flushSSE(w)
				return
			}

			outEv, _ := json.Marshal(map[string]any{
				"type":  "output",
				"delta": fmt.Sprintf("cd: no such file or directory: %s\n", parts[1]),
			})
			w.Write([]byte("data: " + string(outEv) + "\n\n"))
			doneEv, _ := json.Marshal(map[string]any{
				"type":     "done",
				"exitCode": 1,
				"cwd":      targetCwd,
				"user":     sysUser,
				"host":     sysHost,
			})
			w.Write([]byte("data: " + string(doneEv) + "\n\n"))
			flushSSE(w)
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 300*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	if req.ContainerID != "" {
		containerTarget := strings.TrimSpace(req.ContainerID)
		cmd = exec.CommandContext(ctx, "docker", "exec", "-i", containerTarget, "sh", "-c", trimmedCmd)
	} else {
		switch runtime.GOOS {
		case "windows":
			cmd = exec.CommandContext(ctx, "cmd", "/C", trimmedCmd)
		default:
			cmd = exec.CommandContext(ctx, "sh", "-c", trimmedCmd)
		}
		cmd.Dir = targetCwd
	}

	// Disable git interactive prompts
	cmd.Env = append(cmd.Environ(), "GIT_TERMINAL_PROMPT=0", "GIT_ASKPASS=")

	sendChunk := func(text string) {
		if text == "" {
			return
		}
		data, err := json.Marshal(map[string]any{
			"type":  "output",
			"delta": text,
		})
		if err == nil {
			w.Write([]byte("data: " + string(data) + "\n\n"))
			flushSSE(w)
		}
	}

	stdoutWriter := &terminalStreamWriter{onProgress: sendChunk}
	stderrWriter := &terminalStreamWriter{onProgress: sendChunk}
	cmd.Stdout = stdoutWriter
	cmd.Stderr = stderrWriter

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	doneEv, _ := json.Marshal(map[string]any{
		"type":     "done",
		"exitCode": exitCode,
		"cwd":      targetCwd,
		"user":     sysUser,
		"host":     sysHost,
	})
	w.Write([]byte("data: " + string(doneEv) + "\n\n"))
	flushSSE(w)
}
