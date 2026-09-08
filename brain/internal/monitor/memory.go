package monitor

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"brain/server/internal/ai"
)

// MemoryResult is the output of a project memory analysis.
type MemoryResult struct {
	Content string
	Error   string
}

// priorityFiles lists files to read first when building project context.
var priorityFiles = []string{
	"README.md", "README.txt", "readme.md",
	"package.json", "go.mod", "go.sum",
	"requirements.txt", "Pipfile", "pyproject.toml",
	"Gemfile", "Cargo.toml", "composer.json", "pom.xml", "build.gradle",
	"index.html", "index.htm", "style.css", "styles.css", "script.js", "app.js",
	"docker-compose.yml", "docker-compose.yaml", "Dockerfile", "nginx.conf",
	".env.example", ".env.sample",
	"main.go", "main.py", "index.js", "index.ts",
	"app.py", "app.ts", "server.go", "server.js", "server.ts",
	"next.config.js", "next.config.ts", "next.config.mjs",
	"vite.config.js", "vite.config.ts", "nuxt.config.ts", "svelte.config.js",
}

// AnalyzeProjectMemory reads key project files and asks the AI to write a summary.
// callback is called from a goroutine when done.
func AnalyzeProjectMemory(ctx context.Context, modelID, projectPath string, callback func(MemoryResult)) {
	go func() {
		result := runMemoryAnalysis(ctx, modelID, projectPath)
		callback(result)
	}()
}

func runMemoryAnalysis(ctx context.Context, modelID, projectPath string) MemoryResult {
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Project path: %s\n\n", projectPath))

	totalBytes := 0
	maxBytes := 40000

	for _, fname := range priorityFiles {
		if totalBytes >= maxBytes {
			break
		}
		data, err := os.ReadFile(filepath.Join(projectPath, fname))
		if err != nil {
			continue
		}
		chunk := string(data)
		if len(chunk) > 4000 {
			chunk = chunk[:4000] + "\n... (truncated)"
		}
		sb.WriteString(fmt.Sprintf("=== %s ===\n%s\n\n", fname, chunk))
		totalBytes += len(chunk)
	}

	if totalBytes < maxBytes {
		_ = filepath.WalkDir(projectPath, func(path string, d os.DirEntry, err error) error {
			if err != nil || totalBytes >= maxBytes {
				return nil
			}
			name := d.Name()
			if d.IsDir() {
				if strings.HasPrefix(name, ".") || name == "node_modules" ||
					name == "vendor" || name == ".git" || name == "__pycache__" ||
					name == "dist" || name == "build" || name == ".next" {
					return filepath.SkipDir
				}
				rel, _ := filepath.Rel(projectPath, path)
				if strings.Count(rel, string(os.PathSeparator)) > 1 {
					return filepath.SkipDir
				}
				return nil
			}
			ext := strings.ToLower(filepath.Ext(name))
			useful := map[string]bool{
				".go": true, ".py": true, ".ts": true, ".tsx": true,
				".js": true, ".jsx": true, ".rb": true, ".rs": true,
				".java": true, ".cs": true, ".php": true, ".sh": true,
				".yaml": true, ".yml": true, ".toml": true, ".json": true,
				".html": true, ".htm": true, ".css": true, ".sql": true,
			}
			if !useful[ext] {
				return nil
			}
			data, err := os.ReadFile(path)
			if err != nil || len(data) == 0 {
				return nil
			}
			rel, _ := filepath.Rel(projectPath, path)
			chunk := string(data)
			if len(chunk) > 2000 {
				chunk = chunk[:2000] + "\n... (truncated)"
			}
			sb.WriteString(fmt.Sprintf("=== %s ===\n%s\n\n", rel, chunk))
			totalBytes += len(chunk)
			return nil
		})
	}

	if totalBytes == 0 {
		return MemoryResult{Error: "no readable files found in " + projectPath}
	}

	client := ai.NewWithModel(modelID)
	resp := client.Ask(ctx, ai.PromptModeMemory, sb.String(), nil)
	if resp.Err != nil {
		return MemoryResult{Error: resp.Err.Error()}
	}
	return MemoryResult{Content: resp.Text}
}
