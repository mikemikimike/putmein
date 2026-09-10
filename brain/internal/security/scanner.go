package security

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"brain/server/internal/ai"
)

type ScanRequest struct {
	ProjectID   string `json:"projectId"`
	ProjectName string `json:"projectName"`
	ProjectPath string `json:"projectPath"`
	GitDiff     string `json:"gitDiff,omitempty"`
	Trigger     string `json:"trigger"` // "deploy_first_time" | "cicd_pipeline" | "manual"
	ModelID     string `json:"modelId,omitempty"`
}

type FindingItem struct {
	ID             string       `json:"id"`
	RuleID         string       `json:"ruleId"`
	Title          string       `json:"title"`
	Severity       Severity     `json:"severity"`
	Category       RuleCategory `json:"category"`
	Description    string       `json:"description"`
	File           string       `json:"file,omitempty"`
	Line           int          `json:"line,omitempty"`
	CVE            string       `json:"cve,omitempty"`
	Recommendation string       `json:"recommendation"`
}

type ChecklistEvaluation struct {
	RuleID string `json:"ruleId"`
	Status string `json:"status"` // "pass" | "warn" | "fail"
	Note   string `json:"note"`
}

type SecurityReport struct {
	ID          string                `json:"id"`
	ProjectID   string                `json:"projectId"`
	ProjectName string                `json:"projectName"`
	Trigger     string                `json:"trigger"`
	Status      string                `json:"status"` // "passed" | "warning" | "danger"
	Summary     string                `json:"summary"`
	DangerCount int                   `json:"dangerCount"`
	WarnCount   int                   `json:"warnCount"`
	InfoCount   int                   `json:"infoCount"`
	Findings    []FindingItem         `json:"findings"`
	Checklist   []ChecklistEvaluation `json:"checklist"`
	Logs        string                `json:"logs"`
	CreatedAt   time.Time             `json:"createdAt"`
}

// ExecuteScan coordinates deterministic checks and AI deep evaluation.
func ExecuteScan(ctx context.Context, req ScanRequest) (*SecurityReport, error) {
	startTime := time.Now()
	scanID := fmt.Sprintf("scan_%d", startTime.UnixNano())

	var logLines []string
	addLog := func(msg string) {
		ts := time.Now().Format("15:04:05.000")
		logLines = append(logLines, fmt.Sprintf("[%s] %s", ts, msg))
	}

	addLog(fmt.Sprintf("Initiating security audit for '%s' (Trigger: %s)", req.ProjectName, req.Trigger))
	addLog(fmt.Sprintf("Target workspace: %s", req.ProjectPath))

	findings := make([]FindingItem, 0)
	checklistMap := make(map[string]*ChecklistEvaluation)

	// Initialize all predefined rules in checklist as "pass" by default
	for _, r := range PredefinedRules {
		checklistMap[r.ID] = &ChecklistEvaluation{
			RuleID: r.ID,
			Status: "pass",
			Note:   "No violations detected.",
		}
	}

	var manifestsContent, dockerfileContent, sampleCodeContent string

	// ── PHASE 1: Deterministic Heuristic Checks ──
	addLog("Phase 1: Running deterministic rule engine and CVE signature matchers...")

	// 1. Package Manifests & Framework CVEs
	pkgPath := filepath.Join(req.ProjectPath, "package.json")
	if data, err := os.ReadFile(pkgPath); err == nil {
		manifestsContent = string(data)
		addLog("Detected Node/JS package.json manifest. Inspecting package versions...")

		var pkgJSON struct {
			Dependencies    map[string]string `json:"dependencies"`
			DevDependencies map[string]string `json:"devDependencies"`
		}
		if json.Unmarshal(data, &pkgJSON) == nil {
			allDeps := make(map[string]string)
			for k, v := range pkgJSON.Dependencies {
				allDeps[k] = v
			}
			for k, v := range pkgJSON.DevDependencies {
				allDeps[k] = v
			}

			// Check Next.js CVEs
			if nextVer, hasNext := allDeps["next"]; hasNext {
				cleanVer := strings.TrimPrefix(nextVer, "^")
				cleanVer = strings.TrimPrefix(cleanVer, "~")
				addLog(fmt.Sprintf("Auditing 'next' dependency version: %s", cleanVer))

				// CVE-2024-34351: 13.4.0 <= ver <= 14.1.0
				if isNextSSRFRange(cleanVer) {
					addLog("🚨 [CRITICAL] Detected CVE-2024-34351 in Next.js Server Actions!")
					findings = append(findings, FindingItem{
						ID:             fmt.Sprintf("f_%d_1", time.Now().UnixNano()),
						RuleID:         "CVE-NEXT-SSRF-2024",
						Title:          "Critical SSRF Vulnerability in Next.js Server Actions (CVE-2024-34351)",
						Severity:       SeverityDanger,
						Category:       CategoryCVE,
						Description:    fmt.Sprintf("Installed Next.js version (%s) is vulnerable to Host header poisoning leading to Server-Side Request Forgery via Server Actions.", nextVer),
						File:           "package.json",
						CVE:            "CVE-2024-34351",
						Recommendation: "Upgrade 'next' to >= 14.1.1 or 14.2.15+ immediately in package.json.",
					})
					checklistMap["CVE-NEXT-SSRF-2024"] = &ChecklistEvaluation{
						RuleID: "CVE-NEXT-SSRF-2024",
						Status: "fail",
						Note:   fmt.Sprintf("Vulnerable version %s detected.", nextVer),
					}
				}

				// CVE-2025-29927: next < 14.2.15 or (>=15.0.0 and <15.0.3)
				if isNextAuthBypassRange(cleanVer) {
					addLog("🚨 [CRITICAL] Detected CVE-2025-29927 Next.js Middleware Auth Bypass!")
					findings = append(findings, FindingItem{
						ID:             fmt.Sprintf("f_%d_2", time.Now().UnixNano()),
						RuleID:         "CVE-NEXT-AUTH-BYPASS-2025",
						Title:          "Next.js Middleware Subrequest Authorization Bypass (CVE-2025-29927)",
						Severity:       SeverityDanger,
						Category:       CategoryCVE,
						Description:    fmt.Sprintf("Installed Next.js version (%s) allows unauthorized subrequests to bypass route middleware using x-middleware-subrequest headers.", nextVer),
						File:           "package.json",
						CVE:            "CVE-2025-29927",
						Recommendation: "Upgrade 'next' to >= 14.2.15 or >= 15.0.3 immediately.",
					})
					checklistMap["CVE-NEXT-AUTH-BYPASS-2025"] = &ChecklistEvaluation{
						RuleID: "CVE-NEXT-AUTH-BYPASS-2025",
						Status: "fail",
						Note:   fmt.Sprintf("Vulnerable version %s detected.", nextVer),
					}
				}
			}

			// Check lodash
			if lodashVer, hasLodash := allDeps["lodash"]; hasLodash {
				cleanLodash := strings.TrimPrefix(strings.TrimPrefix(lodashVer, "^"), "~")
				if strings.HasPrefix(cleanLodash, "4.") && cleanLodash < "4.17.21" {
					addLog("⚠️ [WARN] Detected outdated lodash with prototype pollution flaw.")
					findings = append(findings, FindingItem{
						ID:             fmt.Sprintf("f_%d_3", time.Now().UnixNano()),
						RuleID:         "CVE-LODASH-PROTO",
						Title:          "Lodash Prototype Pollution (CVE-2020-8203)",
						Severity:       SeverityWarning,
						Category:       CategoryCVE,
						Description:    fmt.Sprintf("Installed lodash version (%s) has known prototype pollution vulnerabilities.", lodashVer),
						File:           "package.json",
						CVE:            "CVE-2020-8203",
						Recommendation: "Upgrade 'lodash' to >= 4.17.21 or replace with native JS.",
					})
					checklistMap["CVE-LODASH-PROTO"] = &ChecklistEvaluation{
						RuleID: "CVE-LODASH-PROTO",
						Status: "warn",
						Note:   fmt.Sprintf("Version %s requires update to 4.17.21.", lodashVer),
					}
				}
			}
		}
	}

	// 2. Dockerfile Configuration Checks
	dockerfilePath := filepath.Join(req.ProjectPath, "Dockerfile")
	if data, err := os.ReadFile(dockerfilePath); err == nil {
		dockerfileContent = string(data)
		addLog("Found Dockerfile. Inspecting container security posture...")

		hasUserDirective := regexp.MustCompile(`(?m)^\s*USER\s+`).Match(data)
		if !hasUserDirective {
			addLog("⚠️ [WARN] Container does not specify non-root USER instruction.")
			findings = append(findings, FindingItem{
				ID:             fmt.Sprintf("f_%d_4", time.Now().UnixNano()),
				RuleID:         "CONTAINER-ROOT-USER",
				Title:          "Container Execution as Root",
				Severity:       SeverityWarning,
				Category:       CategoryContainer,
				Description:    "The container image runs as root by default. If compromised, attackers obtain root privileges inside the container.",
				File:           "Dockerfile",
				Recommendation: "Add 'USER node' or 'USER appuser' prior to CMD/ENTRYPOINT.",
			})
			checklistMap["CONTAINER-ROOT-USER"] = &ChecklistEvaluation{
				RuleID: "CONTAINER-ROOT-USER",
				Status: "warn",
				Note:   "No USER directive found in Dockerfile.",
			}
		}

		// Check for sensitive copies in Dockerfile
		if regexp.MustCompile(`(?m)^\s*COPY\s+\.env`).Match(data) {
			addLog("🚨 [CRITICAL] Dockerfile explicitly copies .env file into container image!")
			findings = append(findings, FindingItem{
				ID:             fmt.Sprintf("f_%d_5", time.Now().UnixNano()),
				RuleID:         "CONTAINER-SENSITIVE-COPY",
				Title:          "Sensitive Secrets Embedded in Docker Image",
				Severity:       SeverityDanger,
				Category:       CategoryContainer,
				Description:    "Dockerfile copies .env directly into the container image layer, leaking secrets to anyone with image read access.",
				File:           "Dockerfile",
				Recommendation: "Remove COPY .env from Dockerfile and pass secrets via runtime environment variables.",
			})
			checklistMap["CONTAINER-SENSITIVE-COPY"] = &ChecklistEvaluation{
				RuleID: "CONTAINER-SENSITIVE-COPY",
				Status: "fail",
				Note:   "Explicit COPY of .env detected.",
			}
		}
	}

	// 3. Scan Files & Git Diff for Leaked Secrets
	addLog("Scanning codebase and git changes for leaked API keys, tokens, and private keys...")
	scannedSecretFiles := 0
	_ = filepath.Walk(req.ProjectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			if info != nil && info.IsDir() {
				base := filepath.Base(path)
				if base == "node_modules" || base == ".git" || base == ".next" || base == "dist" || base == "build" {
					return filepath.SkipDir
				}
			}
			return nil
		}

		// Limit scan to text/code files
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".ts" || ext == ".tsx" || ext == ".js" || ext == ".jsx" || ext == ".json" || ext == ".env" || strings.HasPrefix(filepath.Base(path), ".env") {
			if info.Size() > 500*1024 { // skip files > 500KB
				return nil
			}
			scannedSecretFiles++
			content, rErr := os.ReadFile(path)
			if rErr != nil {
				return nil
			}

			relPath, _ := filepath.Rel(req.ProjectPath, path)
			for _, pat := range SecretPatterns {
				if pat.Regex.Match(content) {
					addLog(fmt.Sprintf("🚨 [SECRET LEAK] %s found in %s!", pat.Title, relPath))
					findings = append(findings, FindingItem{
						ID:             fmt.Sprintf("f_%d_%s", time.Now().UnixNano(), pat.ID),
						RuleID:         "SECRET-API-KEYS",
						Title:          fmt.Sprintf("Exposed Credential: %s", pat.Title),
						Severity:       pat.Severity,
						Category:       CategorySecret,
						Description:    fmt.Sprintf("%s found hardcoded in %s.", pat.Description, relPath),
						File:           relPath,
						Recommendation: "Remove the credential from the codebase immediately, revoke the existing key, and use environment variables.",
					})
					checklistMap["SECRET-API-KEYS"] = &ChecklistEvaluation{
						RuleID: "SECRET-API-KEYS",
						Status: "fail",
						Note:   fmt.Sprintf("Hardcoded secret discovered in %s.", relPath),
					}
				}
			}
		}
		return nil
	})
	addLog(fmt.Sprintf("Scanned %d source & configuration files for credentials.", scannedSecretFiles))

	// Also check gitDiff for secrets if provided
	if req.GitDiff != "" {
		addLog("Auditing git diff for newly introduced credentials or vulnerabilities...")
		for _, pat := range SecretPatterns {
			if pat.Regex.MatchString(req.GitDiff) {
				addLog(fmt.Sprintf("🚨 [DIFF ALERT] %s detected in incoming commit diff!", pat.Title))
				findings = append(findings, FindingItem{
					ID:             fmt.Sprintf("f_%d_diff_%s", time.Now().UnixNano(), pat.ID),
					RuleID:         "SECRET-API-KEYS",
					Title:          fmt.Sprintf("Leaked %s in Git Commit", pat.Title),
					Severity:       pat.Severity,
					Category:       CategorySecret,
					Description:    fmt.Sprintf("The incoming commit introduces a hardcoded %s.", pat.Title),
					File:           "git-diff",
					Recommendation: "Revoke the committed key, rewrite git history if needed, and inject credentials via environment variables.",
				})
			}
		}
	}

	// ── PHASE 2: AI Security Auditor Evaluation ──
	addLog("Phase 2: Submitting workspace architecture & signatures to Ray AI Security Auditor...")

	// Gather key source snippets for AI context
	var sampleCodeBuilder strings.Builder
	sampleFilesCount := 0
	_ = filepath.Walk(req.ProjectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || sampleFilesCount >= 6 {
			return nil
		}
		rel, _ := filepath.Rel(req.ProjectPath, path)
		if strings.Contains(rel, "route.ts") || strings.Contains(rel, "api/") || strings.Contains(rel, "middleware.ts") || strings.Contains(rel, "auth.ts") {
			if data, readErr := os.ReadFile(path); readErr == nil && len(data) < 8000 {
				sampleCodeBuilder.WriteString(fmt.Sprintf("--- File: %s ---\n%s\n\n", rel, string(data)))
				sampleFilesCount++
			}
		}
		return nil
	})
	sampleCodeContent = sampleCodeBuilder.String()

	aiModelID := req.ModelID
	if aiModelID == "" {
		models := ai.GetModels()
		if len(models) > 0 {
			aiModelID = models[0].ID
		}
	}

	promptText := BuildSecurityAuditPrompt(req.ProjectName, manifestsContent, req.GitDiff, dockerfileContent, sampleCodeContent)
	aiClient := ai.NewWithModel(aiModelID)

	aiResp := aiClient.Ask(ctx, ai.PromptModeWeb, promptText, nil)
	if aiResp.Err != nil {
		addLog(fmt.Sprintf("AI audit service encountered error: %v (Falling back to heuristic results)", aiResp.Err))
	} else {
		addLog("AI Security Auditor completed analysis. Parsing findings...")
		parseAIFindings(aiResp.Text, &findings, checklistMap, addLog)
	}

	// ── PHASE 3: Synthesis & Report Generation ──
	dangerCount := 0
	warnCount := 0
	infoCount := 0

	for _, f := range findings {
		switch f.Severity {
		case SeverityDanger:
			dangerCount++
		case SeverityWarning:
			warnCount++
		case SeverityInfo:
			infoCount++
		}
	}

	var overallStatus string
	var summaryText string

	if dangerCount > 0 {
		overallStatus = "danger"
		summaryText = fmt.Sprintf("CRITICAL SECURITY DANGER: %d high-risk vulnerability(ies) detected! Public deployment must be blocked until addressed or explicitly authorized.", dangerCount)
		addLog(fmt.Sprintf("❌ AUDIT FAILED with status 'danger' (%d Danger, %d Warning, %d Info).", dangerCount, warnCount, infoCount))
	} else if warnCount > 0 {
		overallStatus = "warning"
		summaryText = fmt.Sprintf("SECURITY ATTENTION: %d moderate warning(s) detected. Review recommended prior to release.", warnCount)
		addLog(fmt.Sprintf("⚠️ AUDIT COMPLETED with status 'warning' (%d Danger, %d Warning, %d Info).", dangerCount, warnCount, infoCount))
	} else {
		overallStatus = "passed"
		summaryText = "SECURITY PASSED: All checklist items passed with zero critical vulnerabilities."
		addLog(fmt.Sprintf("✅ AUDIT PASSED with status 'passed' (0 Danger, 0 Warning, %d Info).", infoCount))
	}

	checklistList := make([]ChecklistEvaluation, 0, len(checklistMap))
	for _, c := range checklistMap {
		checklistList = append(checklistList, *c)
	}

	report := &SecurityReport{
		ID:          scanID,
		ProjectID:   req.ProjectID,
		ProjectName: req.ProjectName,
		Trigger:     req.Trigger,
		Status:      overallStatus,
		Summary:     summaryText,
		DangerCount: dangerCount,
		WarnCount:   warnCount,
		InfoCount:   infoCount,
		Findings:    findings,
		Checklist:   checklistList,
		Logs:        strings.Join(logLines, "\n"),
		CreatedAt:   startTime,
	}

	return report, nil
}

// Helpers for version range detection
func isNextSSRFRange(ver string) bool {
	// Vulnerable: >= 13.4.0 and < 14.1.1
	// Simplified regex check
	if strings.HasPrefix(ver, "13.4.") || strings.HasPrefix(ver, "13.5.") || strings.HasPrefix(ver, "14.0.") || ver == "14.1.0" {
		return true
	}
	return false
}

func isNextAuthBypassRange(ver string) bool {
	// Vulnerable: 14.x < 14.2.15 or 15.0.0-15.0.2
	if strings.HasPrefix(ver, "14.") {
		parts := strings.Split(ver, ".")
		if len(parts) >= 3 {
			if parts[1] == "0" || parts[1] == "1" {
				return true
			}
			if parts[1] == "2" {
				var patch int
				fmt.Sscanf(parts[2], "%d", &patch)
				if patch < 15 {
					return true
				}
			}
		}
	}
	if strings.HasPrefix(ver, "15.0.0") || strings.HasPrefix(ver, "15.0.1") || strings.HasPrefix(ver, "15.0.2") {
		return true
	}
	return false
}

// parseAIFindings attempts to extract clean JSON findings from the AI response.
func parseAIFindings(aiText string, findings *[]FindingItem, checklistMap map[string]*ChecklistEvaluation, addLog func(string)) {
	clean := strings.TrimSpace(aiText)
	if strings.HasPrefix(clean, "```") {
		lines := strings.Split(clean, "\n")
		if len(lines) > 2 {
			lines = lines[1 : len(lines)-1]
			clean = strings.Join(lines, "\n")
		}
	}

	var parsed struct {
		Summary  string `json:"summary"`
		Status   string `json:"status"`
		Findings []struct {
			ID             string `json:"id"`
			RuleID         string `json:"ruleId"`
			Title          string `json:"title"`
			Severity       string `json:"severity"`
			Category       string `json:"category"`
			Description    string `json:"description"`
			File           string `json:"file"`
			Line           int    `json:"line"`
			CVE            string `json:"cve"`
			Recommendation string `json:"recommendation"`
		} `json:"findings"`
		Checklist []struct {
			RuleID string `json:"ruleId"`
			Status string `json:"status"`
			Note   string `json:"note"`
		} `json:"checklist"`
	}

	if err := json.Unmarshal([]byte(clean), &parsed); err != nil {
		// Attempt to locate JSON object substring
		start := strings.Index(clean, "{")
		end := strings.LastIndex(clean, "}")
		if start != -1 && end != -1 && end > start {
			_ = json.Unmarshal([]byte(clean[start:end+1]), &parsed)
		}
	}

	// Incorporate checklist updates
	for _, c := range parsed.Checklist {
		if c.RuleID != "" {
			checklistMap[c.RuleID] = &ChecklistEvaluation{
				RuleID: c.RuleID,
				Status: c.Status,
				Note:   c.Note,
			}
		}
	}

	// Incorporate new findings (avoid exact duplicate titles)
	existingTitles := make(map[string]bool)
	for _, f := range *findings {
		existingTitles[strings.ToLower(f.Title)] = true
	}

	for _, af := range parsed.Findings {
		if af.Title == "" || existingTitles[strings.ToLower(af.Title)] {
			continue
		}

		sev := SeverityInfo
		switch strings.ToLower(af.Severity) {
		case "danger", "critical", "high":
			sev = SeverityDanger
		case "warning", "warn", "medium":
			sev = SeverityWarning
		default:
			sev = SeverityInfo
		}

		cat := CategoryOWASP
		switch strings.ToLower(af.Category) {
		case "cve":
			cat = CategoryCVE
		case "secret":
			cat = CategorySecret
		case "container":
			cat = CategoryContainer
		case "dependency":
			cat = CategoryDependency
		}

		id := af.ID
		if id == "" {
			id = fmt.Sprintf("ai_%d", time.Now().UnixNano())
		}

		addLog(fmt.Sprintf("AI Finding: [%s] %s (%s)", sev, af.Title, af.File))
		*findings = append(*findings, FindingItem{
			ID:             id,
			RuleID:         af.RuleID,
			Title:          af.Title,
			Severity:       sev,
			Category:       cat,
			Description:    af.Description,
			File:           af.File,
			Line:           af.Line,
			CVE:            af.CVE,
			Recommendation: af.Recommendation,
		})
	}
}
