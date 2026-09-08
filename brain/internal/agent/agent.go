package agent

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"brain/server/internal/ai"
)

// AgentEvent is emitted by RunAgent and streamed to callers.
type AgentEvent struct {
	Type string `json:"type"`
	// "text"        : partial AI text output
	// "thinking"    : partial AI thinking block
	// "tool_call"   : AI is about to call a tool
	// "tool_result" : result of a tool call
	// "permission"  : permission request (only when autonomous mode is off)
	// "error"       : fatal error
	// "done"        : agent finished
	Content    string             `json:"content,omitempty"`
	ToolCall   *ToolCall          `json:"toolCall,omitempty"`
	ToolResult *ToolResult        `json:"toolResult,omitempty"`
	Permission *PermissionRequest `json:"permission,omitempty"`
}

// execTagRe matches <exec>command</exec> in AI output.
var execTagRe = regexp.MustCompile(`(?s)<exec>(.*?)</exec>`)

// readTagRe, writeTagRe, etc. for other tools
var readTagRe = regexp.MustCompile(`(?s)<read_file>(.*?)</read_file>`)
var writeTagRe = regexp.MustCompile(`(?s)<write_file path="([^"]+)">(.*?)</write_file>`)
var listTagRe = regexp.MustCompile(`(?s)<list_dir>(.*?)</list_dir>`)
var mkdirTagRe = regexp.MustCompile(`(?s)<create_dir>(.*?)</create_dir>`)
var deleteTagRe = regexp.MustCompile(`(?s)<delete_file>(.*?)</delete_file>`)
var monitorAddRe = regexp.MustCompile(`(?s)<monitor_add name="([^"]+)"\s+path="([^"]+)"(?:\s+interval="(\d+)")?>`)

// extractToolCall checks if the AI text contains a tool invocation tag.
// Returns nil if no tool call is found.
func extractToolCall(text string) *ToolCall {
	if m := execTagRe.FindStringSubmatch(text); len(m) > 1 {
		return &ToolCall{Kind: ToolExec, Command: strings.TrimSpace(m[1])}
	}
	if m := readTagRe.FindStringSubmatch(text); len(m) > 1 {
		return &ToolCall{Kind: ToolReadFile, Path: strings.TrimSpace(m[1])}
	}
	if m := writeTagRe.FindStringSubmatch(text); len(m) > 2 {
		return &ToolCall{Kind: ToolWriteFile, Path: strings.TrimSpace(m[1]), Content: m[2]}
	}
	if m := listTagRe.FindStringSubmatch(text); len(m) > 1 {
		return &ToolCall{Kind: ToolListDir, Path: strings.TrimSpace(m[1])}
	}
	if m := mkdirTagRe.FindStringSubmatch(text); len(m) > 1 {
		return &ToolCall{Kind: ToolCreateDir, Path: strings.TrimSpace(m[1])}
	}
	if m := deleteTagRe.FindStringSubmatch(text); len(m) > 1 {
		return &ToolCall{Kind: ToolDeleteFile, Path: strings.TrimSpace(m[1])}
	}
	if m := monitorAddRe.FindStringSubmatch(text); len(m) > 2 {
		interval := 30
		if len(m) > 3 && m[3] != "" {
			fmt.Sscanf(m[3], "%d", &interval)
		}
		return &ToolCall{Kind: ToolMonitorAdd, ProjectName: strings.TrimSpace(m[1]), ProjectPath: strings.TrimSpace(m[2]), IntervalSec: interval}
	}
	return nil
}

// executeTool runs a ToolCall and returns the ToolResult.
func executeTool(ctx context.Context, tc ToolCall) ToolResult {
	switch tc.Kind {
	case ToolExec:
		out, err := Execute(ctx, tc.Command)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v\n%s", err, out), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: out, Success: true}

	case ToolReadFile:
		content, err := ReadFile(tc.Path)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: content, Success: true}

	case ToolWriteFile:
		err := WriteFile(tc.Path, tc.Content)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("File written: %s", tc.Path), Success: true}

	case ToolListDir:
		listing, err := ListDir(tc.Path)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: listing, Success: true}

	case ToolCreateDir:
		err := CreateDir(tc.Path)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Directory created: %s", tc.Path), Success: true}

	case ToolDeleteFile:
		err := DeleteFile(tc.Path)
		if err != nil {
			return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
		}
		return ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Deleted: %s", tc.Path), Success: true}
	}

	return ToolResult{Kind: tc.Kind, Output: "unknown tool", Success: false}
}

// RunAgentOptions holds per-request options for the agent.
type RunAgentOptions struct {
	ModelID   string
	Mode      ai.PromptMode
	UserInput string
	History   []ai.HistoryEntry
	// PermissionGrant is a channel the caller sends true/false into when
	// the agent emits a "permission" event. If nil, autonomous mode is assumed.
	PermissionGrant <-chan bool
	// MonitorAddCallback is called when the AI emits a <monitor_add> tag and the user approves.
	// If nil, monitor_add tool calls will return an error.
	MonitorAddCallback func(name, path string, intervalSec int) error
}

// RunAgent runs the full agent loop: ask AI → detect tool call → emit permission
// event → execute (if approved) → feed result back → repeat until done.
// It streams AgentEvents to the returned channel.
func RunAgent(ctx context.Context, opts RunAgentOptions) <-chan AgentEvent {
	events := make(chan AgentEvent, 64)

	go func() {
		defer close(events)

		client := ai.NewWithModel(opts.ModelID)
		history := make([]ai.HistoryEntry, len(opts.History))
		copy(history, opts.History)

		userInput := opts.UserInput

		// Maximum agent loop iterations to prevent infinite loops
		const maxIterations = 10
		for iter := 0; iter < maxIterations; iter++ {
			// Stream AI response
			stream := client.AskStream(ctx, opts.Mode, userInput, history)

			var fullText strings.Builder
			var fullThinking strings.Builder

			for chunk := range stream {
				switch chunk.Type {
				case "text":
					fullText.WriteString(chunk.Content)
					events <- AgentEvent{Type: "text", Content: chunk.Content}
				case "thinking":
					fullThinking.WriteString(chunk.Content)
					events <- AgentEvent{Type: "thinking", Content: chunk.Content}
				case "error":
					events <- AgentEvent{Type: "error", Content: chunk.Err.Error()}
					return
				}
			}

			if ctx.Err() != nil {
				events <- AgentEvent{Type: "error", Content: "cancelled"}
				return
			}

			text := fullText.String()

			// Add assistant response to history
			history = append(history, ai.HistoryEntry{Role: "assistant", Content: text})

			// Check for a tool call in the response
			tc := extractToolCall(text)
			if tc == nil {
				// No tool call. Agent is done
				events <- AgentEvent{Type: "done"}
				return
			}

			// Emit tool_call event so the caller can display it
			events <- AgentEvent{Type: "tool_call", ToolCall: tc}

			// --- Permission gate ---
			autonomous := IsAutonomousMode()

			if !autonomous && opts.PermissionGrant != nil {
				// Emit permission request and wait for the caller's answer
				perm := tc.PermissionSummary()
				events <- AgentEvent{Type: "permission", Permission: &perm}

				select {
				case approved, ok := <-opts.PermissionGrant:
					if !ok || !approved {
						events <- AgentEvent{Type: "error", Content: "Tool call denied by user."}
						return
					}
				case <-ctx.Done():
					events <- AgentEvent{Type: "error", Content: "cancelled"}
					return
				}
			} else if !autonomous {
				// No channel provided, deny by default in non-autonomous mode
				events <- AgentEvent{Type: "error", Content: "Tool call requires permission but no grant channel provided."}
				return
			}

			// Execute the tool, monitor_add is handled specially via the callback
			var result ToolResult
			if tc.Kind == ToolMonitorAdd {
				if opts.MonitorAddCallback != nil {
					err := opts.MonitorAddCallback(tc.ProjectName, tc.ProjectPath, tc.IntervalSec)
					if err != nil {
						result = ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Error: %v", err), Success: false}
					} else {
						result = ToolResult{Kind: tc.Kind, Output: fmt.Sprintf("Project %q added to monitor at %s (every %ds)", tc.ProjectName, tc.ProjectPath, tc.IntervalSec), Success: true}
					}
				} else {
					result = ToolResult{Kind: tc.Kind, Output: "Monitor service not available", Success: false}
				}
			} else {
				result = executeTool(ctx, *tc)
			}
			events <- AgentEvent{Type: "tool_result", ToolResult: &result}

			// Build feedback message to send back to the AI
			status := "succeeded"
			if !result.Success {
				status = "failed"
			}
			feedbackMsg := fmt.Sprintf("[TOOL OUTPUT] Tool %q %s:\n%s", string(tc.Kind), status, result.Output)

			// Feed the result back into history and loop
			history = append(history, ai.HistoryEntry{Role: "user", Content: feedbackMsg})
			userInput = feedbackMsg
		}

		events <- AgentEvent{Type: "error", Content: "agent: max iterations reached"}
	}()

	return events
}
