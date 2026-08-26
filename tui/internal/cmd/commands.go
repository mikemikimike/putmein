package cmd

import "strings"

// ActionKind identifies what slash-command was typed.
type ActionKind string

const (
	ActionHelp     ActionKind = "help"
	ActionSessions ActionKind = "sessions"
	ActionNew      ActionKind = "new"
	ActionClear    ActionKind = "clear"
	ActionExit     ActionKind = "exit"
	ActionRename   ActionKind = "rename"
	ActionNone     ActionKind = ""
)

// Result is returned by Parse for every input.
type Result struct {
	IsCommand bool
	Action    ActionKind
	// Extra holds the argument for commands like /rename <name>
	Extra string
}

// Parse inspects the raw input string and returns a Result.
func Parse(input string) Result {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)

	switch lower {
	case "/help":
		return Result{IsCommand: true, Action: ActionHelp}
	case "/clear":
		return Result{IsCommand: true, Action: ActionClear}
	case "/exit", "/quit", "/q":
		return Result{IsCommand: true, Action: ActionExit}
	case "/sessions":
		return Result{IsCommand: true, Action: ActionSessions}
	case "/new":
		return Result{IsCommand: true, Action: ActionNew}
	}

	if strings.HasPrefix(lower, "/rename ") {
		name := strings.TrimSpace(trimmed[8:])
		if name != "" {
			return Result{IsCommand: true, Action: ActionRename, Extra: name}
		}
	}

	return Result{IsCommand: false}
}
