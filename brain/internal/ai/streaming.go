package ai

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// WriteSSEEvent writes a single SSE event to the ResponseWriter.
// format: "data: {json}\n\n"
func WriteSSEEvent(w http.ResponseWriter, event map[string]any) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	return err
}

// FlushSSE flushes buffered SSE data to the client immediately.
func FlushSSE(w http.ResponseWriter) {
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

// WriteSSETextDelta writes a text delta chunk in AI SDK UIMessage stream format.
// This format is compatible with the Vercel AI SDK's useChat hook.
func WriteSSETextDelta(w http.ResponseWriter, text string) error {
	// Vercel AI SDK text-delta format
	data, err := json.Marshal(text)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "0:%s\n", data)
	if err != nil {
		return err
	}
	FlushSSE(w)
	return nil
}

// WriteSSEFinish writes the finish marker in AI SDK UIMessage stream format.
func WriteSSEFinish(w http.ResponseWriter) error {
	_, err := fmt.Fprintf(w, "d:{\"finishReason\":\"stop\",\"usage\":{\"promptTokens\":0,\"completionTokens\":0}}\n")
	FlushSSE(w)
	return err
}

// WriteSSEError writes an error event.
func WriteSSEError(w http.ResponseWriter, errMsg string) error {
	data, err := json.Marshal(errMsg)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "3:%s\n", data)
	FlushSSE(w)
	return err
}

// WriteSSEToolStart emits a tool-start event so the UI can open the terminal panel.
// data: {"type":"tool-start","tool":"exec","cmd":"ls -la","user":"hamza","host":"MacBook-Air"}
func WriteSSEToolStart(w http.ResponseWriter, tool, cmd, user, host string) error {
	data, err := json.Marshal(map[string]any{
		"type": "tool-start",
		"tool": tool,
		"cmd":  cmd,
		"user": user,
		"host": host,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}

// WriteSSEThinking emits a thinking/reasoning delta event so the UI can show live thought processes.
// data: {"type":"thinking-delta","delta":"..."}
func WriteSSEThinking(w http.ResponseWriter, delta string) error {
	data, err := json.Marshal(map[string]any{
		"type":  "thinking-delta",
		"delta": delta,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}

// WriteSSEToolOutput emits a chunk of terminal output for the currently running tool.
// data: {"type":"tool-output","delta":"..."}
func WriteSSEToolOutput(w http.ResponseWriter, delta string) error {
	data, err := json.Marshal(map[string]any{
		"type":  "tool-output",
		"delta": delta,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}

// WriteSSEToolEnd emits a tool-end event with exit status.
// data: {"type":"tool-end","exit":0}
func WriteSSEToolEnd(w http.ResponseWriter, exit int) error {
	data, err := json.Marshal(map[string]any{
		"type": "tool-end",
		"exit": exit,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}

// SetSSEHeaders sets the required headers for a streaming SSE response.
func SetSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	// AI SDK requires this header
	w.Header().Set("x-vercel-ai-data-stream", "v1")
}

// WriteSSEApprovalRequest emits an approval-request event so the frontend can show Approve/Deny.
// data: {"type":"approval-request","id":"uuid","tool":"exec","cmd":"ls -la"}
func WriteSSEApprovalRequest(w http.ResponseWriter, id, tool, cmd string) error {
	data, err := json.Marshal(map[string]any{
		"type": "approval-request",
		"id":   id,
		"tool": tool,
		"cmd":  cmd,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}

// WriteSSEMonitorAddRequest emits a monitor_add approval-request event with project metadata.
func WriteSSEMonitorAddRequest(w http.ResponseWriter, id, projectName, projectPath string, intervalSec int) error {
	data, err := json.Marshal(map[string]any{
		"type":        "approval-request",
		"id":          id,
		"tool":        "monitor_add",
		"cmd":         "monitor_add name=\"" + projectName + "\" path=\"" + projectPath + "\"",
		"projectName": projectName,
		"projectPath": projectPath,
		"intervalSec": intervalSec,
	})
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", data)
	FlushSSE(w)
	return err
}
