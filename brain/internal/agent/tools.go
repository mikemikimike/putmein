package agent

// ToolKind identifies a tool the agent can call.
type ToolKind string

const (
	ToolExec       ToolKind = "exec"
	ToolReadFile   ToolKind = "read_file"
	ToolWriteFile  ToolKind = "write_file"
	ToolListDir    ToolKind = "list_dir"
	ToolCreateDir  ToolKind = "create_dir"
	ToolDeleteFile ToolKind = "delete_file"
	ToolMonitorAdd ToolKind = "monitor_add"
)

// ToolCall is a request from the AI to invoke a system tool.
type ToolCall struct {
	Kind ToolKind `json:"kind"`
	// For exec: the shell command to run.
	Command string `json:"command,omitempty"`
	// For file ops: the target path.
	Path string `json:"path,omitempty"`
	// For write_file: the content to write.
	Content string `json:"content,omitempty"`
	// For monitor_add: the project details.
	ProjectName string `json:"projectName,omitempty"`
	ProjectPath string `json:"projectPath,omitempty"`
	IntervalSec int    `json:"intervalSec,omitempty"`
}

// ToolResult is the result of executing a tool.
type ToolResult struct {
	Kind    ToolKind `json:"kind"`
	Output  string   `json:"output"`
	Success bool     `json:"success"`
}

// ToolDef describes a tool to display to the user or AI.
type ToolDef struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// AllTools returns the list of available tool definitions.
func AllTools() []ToolDef {
	return []ToolDef{
		{
			Name:        string(ToolExec),
			Description: "Execute a shell command on the host system",
		},
		{
			Name:        string(ToolReadFile),
			Description: "Read the contents of a file",
		},
		{
			Name:        string(ToolWriteFile),
			Description: "Write or create a file with given content",
		},
		{
			Name:        string(ToolListDir),
			Description: "List the contents of a directory",
		},
		{
			Name:        string(ToolCreateDir),
			Description: "Create a directory (mkdir -p)",
		},
		{
			Name:        string(ToolDeleteFile),
			Description: "Delete a file",
		},
		{
			Name:        string(ToolMonitorAdd),
			Description: "Add a project to the 24/7 monitor system for log watching",
		},
	}
}

// PermissionSummary returns a human-readable description of a tool call,
// shown to the user in the permission prompt.
func (tc ToolCall) PermissionSummary() PermissionRequest {
	switch tc.Kind {
	case ToolExec:
		return PermissionRequest{
			ToolName:    "Run Command",
			Description: "The AI wants to execute a shell command",
			Args:        "$ " + tc.Command,
		}
	case ToolReadFile:
		return PermissionRequest{
			ToolName:    "Read File",
			Description: "The AI wants to read a file",
			Args:        tc.Path,
		}
	case ToolWriteFile:
		return PermissionRequest{
			ToolName:    "Write File",
			Description: "The AI wants to write a file",
			Args:        tc.Path,
		}
	case ToolListDir:
		return PermissionRequest{
			ToolName:    "List Directory",
			Description: "The AI wants to list a directory",
			Args:        tc.Path,
		}
	case ToolCreateDir:
		return PermissionRequest{
			ToolName:    "Create Directory",
			Description: "The AI wants to create a directory",
			Args:        "mkdir -p " + tc.Path,
		}
	case ToolDeleteFile:
		return PermissionRequest{
			ToolName:    "Delete File",
			Description: "The AI wants to delete a file",
			Args:        tc.Path,
		}
	case ToolMonitorAdd:
		return PermissionRequest{
			ToolName:    "Add to Monitor",
			Description: "The AI wants to add a project to the 24/7 monitor system",
			Args:        tc.ProjectName + " at " + tc.ProjectPath,
		}
	}
	return PermissionRequest{ToolName: string(tc.Kind), Args: tc.Path + tc.Command}
}
