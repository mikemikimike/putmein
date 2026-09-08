package agent

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

const defaultCommandTimeout = 30 * time.Second

type streamWriter struct {
	buf        bytes.Buffer
	onProgress func(string)
}

func (sw *streamWriter) Write(p []byte) (n int, err error) {
	sw.buf.Write(p)
	if sw.onProgress != nil && len(p) > 0 {
		sw.onProgress(string(p))
	}
	return len(p), nil
}

// Execute runs a shell command and returns its combined output.
// It respects the provided context for cancellation.
func Execute(ctx context.Context, command string) (string, error) {
	return ExecuteWithStream(ctx, command, nil)
}

// ExecuteWithStream runs a shell command, streams live output chunks via onProgress, and returns combined output.
func ExecuteWithStream(ctx context.Context, command string, onProgress func(string)) (string, error) {
	lowerCmd := strings.ToLower(command)
	// Guard against killing the host dashboard (port 3000 / node) or brain (port 3100)
	if strings.Contains(lowerCmd, "kill") || strings.Contains(lowerCmd, "pkill") || strings.Contains(lowerCmd, "fuser") {
		if strings.Contains(lowerCmd, ":3000") || strings.Contains(lowerCmd, " 3000") ||
			strings.Contains(lowerCmd, ":3100") || strings.Contains(lowerCmd, " 3100") ||
			strings.Contains(lowerCmd, "killall node") || strings.Contains(lowerCmd, "pkill node") ||
			strings.Contains(lowerCmd, "pkill -f node") || strings.Contains(lowerCmd, "pkill -9 node") ||
			strings.Contains(lowerCmd, "pkill -f brain") {
			return "[BLOCKED FOR SAFETY]: Port 3000 is used by the Ray Dashboard server itself and port 3100 is used by Brain. NEVER kill dashboard or brain processes. Instead, use an alternative host port (e.g. 3001, 3002, 4000, 4001, 8080) for your container.", nil
		}

		// Check if PID in command belongs to port 3000 or 3100
		if lsofOut, err := exec.Command("lsof", "-t", "-i:3000", "-i:3100").Output(); err == nil {
			for _, pidStr := range strings.Fields(string(lsofOut)) {
				if pidStr != "" && (strings.Contains(command, " "+pidStr) || strings.HasSuffix(command, pidStr)) {
					return fmt.Sprintf("[BLOCKED FOR SAFETY]: Process PID %s is the Ray Dashboard / Brain server on port 3000/3100. NEVER kill the host server. Instead, allocate an available port (e.g. 3001, 3002, 4000, 4001, 8080) for your application container.", pidStr), nil
				}
			}
		}
	}

	// Apply a default timeout if the context has no deadline
	if _, hasDeadline := ctx.Deadline(); !hasDeadline {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, defaultCommandTimeout)
		defer cancel()
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.CommandContext(ctx, "cmd", "/C", command)
	default:
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}

	// Disable interactive git prompts to prevent VS Code or terminal dialog popups
	cmd.Env = append(cmd.Environ(), "GIT_TERMINAL_PROMPT=0", "GIT_ASKPASS=")

	stdoutWriter := &streamWriter{onProgress: onProgress}
	stderrWriter := &streamWriter{onProgress: onProgress}
	cmd.Stdout = stdoutWriter
	cmd.Stderr = stderrWriter

	err := cmd.Run()

	out := strings.TrimSpace(stdoutWriter.buf.String())
	errOut := strings.TrimSpace(stderrWriter.buf.String())

	combined := out
	if errOut != "" {
		if combined != "" {
			combined += "\n"
		}
		combined += errOut
	}

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return combined, fmt.Errorf("command timed out after %s", defaultCommandTimeout)
		}
		if ctx.Err() == context.Canceled {
			return combined, fmt.Errorf("command was cancelled")
		}
		// Non-zero exit code. Still return output alongside the error
		return combined, fmt.Errorf("exit code %v: %s", cmd.ProcessState.ExitCode(), errOut)
	}

	if combined == "" {
		combined = "(no output)"
	}
	return combined, nil
}
