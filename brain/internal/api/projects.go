package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"brain/server/internal/monitor"
)

// FileTreeNode represents a node in the project file structure explorer
type FileTreeNode struct {
	Name     string         `json:"name"`
	Path     string         `json:"path"`
	RelPath  string         `json:"relPath"`
	Type     string         `json:"type"` // "file" | "directory"
	Size     int64          `json:"size,omitempty"`
	Ext      string         `json:"ext,omitempty"`
	Children []FileTreeNode `json:"children,omitempty"`
}

// GET /v1/projects/files?path=/path/to/project
func projectsFilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	projectPath := r.URL.Query().Get("path")
	if projectPath == "" {
		http.Error(w, "path parameter required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(projectPath)
	if err != nil || !info.IsDir() {
		http.Error(w, "directory not found", http.StatusNotFound)
		return
	}

	tree := buildFileTree(projectPath, projectPath, 0, 5)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"root":     projectPath,
		"tree":     tree,
		"name":     filepath.Base(projectPath),
	})
}

// GET /v1/projects/file-content?path=/path/to/file
func projectsFileContentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		http.Error(w, "path parameter required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(filePath)
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}
	if info.IsDir() {
		http.Error(w, "cannot read directory as file", http.StatusBadRequest)
		return
	}

	// Limit to 1MB
	const maxRead = 1024 * 1024
	data, err := os.ReadFile(filePath)
	if err != nil {
		http.Error(w, "failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	content := string(data)
	truncated := false
	if len(content) > maxRead {
		content = content[:maxRead] + "\n... (truncated)"
		truncated = true
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"path":      filePath,
		"name":      filepath.Base(filePath),
		"size":      info.Size(),
		"content":   content,
		"truncated": truncated,
	})
}

// POST /v1/projects/analyze — trigger AI memory analysis
func projectsAnalyzeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path    string `json:"path"`
		ModelID string `json:"modelId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Path == "" {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.ModelID == "" {
		req.ModelID = "MiniMax-M2.5"
	}

	monitor.AnalyzeProjectMemory(r.Context(), req.ModelID, req.Path, func(res monitor.MemoryResult) {
		// Asynchronous callback complete
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "analyzing",
		"path":   req.Path,
	})
}

func buildFileTree(rootDir, currentDir string, depth, maxDepth int) []FileTreeNode {
	if depth > maxDepth {
		return nil
	}

	entries, err := os.ReadDir(currentDir)
	if err != nil {
		return nil
	}

	var nodes []FileTreeNode
	for _, entry := range entries {
		name := entry.Name()
		// Skip ignored directories
		if strings.HasPrefix(name, ".") || name == "node_modules" ||
			name == "vendor" || name == "__pycache__" || name == "dist" ||
			name == "build" || name == ".next" || name == ".turbo" {
			continue
		}

		fullPath := filepath.Join(currentDir, name)
		relPath, _ := filepath.Rel(rootDir, fullPath)

		if entry.IsDir() {
			children := buildFileTree(rootDir, fullPath, depth+1, maxDepth)
			nodes = append(nodes, FileTreeNode{
				Name:     name,
				Path:     fullPath,
				RelPath:  relPath,
				Type:     "directory",
				Children: children,
			})
		} else {
			info, _ := entry.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			nodes = append(nodes, FileTreeNode{
				Name:    name,
				Path:    fullPath,
				RelPath: relPath,
				Type:    "file",
				Size:    size,
				Ext:     strings.ToLower(filepath.Ext(name)),
			})
		}
	}

	// Sort directories first, then alphabetically
	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].Type != nodes[j].Type {
			return nodes[i].Type == "directory"
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})

	return nodes
}
