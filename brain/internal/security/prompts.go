package security

import (
	"encoding/json"
	"fmt"
	"strings"
)

// SecurityAuditPrompt builds the structured prompt sent to the AI security auditor.
func BuildSecurityAuditPrompt(projectName string, manifests string, gitDiff string, dockerfile string, sampleCode string) string {
	rulesJSON, _ := json.MarshalIndent(PredefinedRules, "", "  ")

	var sb strings.Builder
	sb.WriteString("You are Ray Security Brain, an elite DevOps and Application Security Auditor.\n")
	sb.WriteString("Your task is to conduct a thorough, rigorous security evaluation of the given project files, dependencies, configuration, and recent changes.\n\n")

	sb.WriteString("### PREDEFINED SECURITY RULES & KNOWN CVE CHECKLIST TO EVALUATE:\n")
	sb.WriteString("```json\n")
	sb.WriteString(string(rulesJSON))
	sb.WriteString("\n```\n\n")

	sb.WriteString("### PROJECT CONTEXT:\n")
	sb.WriteString(fmt.Sprintf("- **Project Name**: %s\n", projectName))

	if manifests != "" {
		sb.WriteString("\n#### DEPENDENCY & PACKAGE MANIFESTS:\n```\n")
		sb.WriteString(manifests)
		sb.WriteString("\n```\n")
	}

	if dockerfile != "" {
		sb.WriteString("\n#### DOCKERFILE / CONTAINER CONFIGURATION:\n```dockerfile\n")
		sb.WriteString(dockerfile)
		sb.WriteString("\n```\n")
	}

	if gitDiff != "" {
		sb.WriteString("\n#### RECENT GIT COMMITS / PIPELINE CHANGES (DIFF):\n```diff\n")
		sb.WriteString(gitDiff)
		sb.WriteString("\n```\n")
	}

	if sampleCode != "" {
		sb.WriteString("\n#### KEY APPLICATION CODE & ROUTE SAMPLES:\n```\n")
		sb.WriteString(sampleCode)
		sb.WriteString("\n```\n")
	}

	sb.WriteString("\n### AUDIT INSTRUCTIONS:\n")
	sb.WriteString("1. Check for the known CVEs listed in the rules (especially Next.js SSRF CVE-2024-34351, Next.js Middleware Auth Bypass CVE-2025-29927, Babel, lodash).\n")
	sb.WriteString("2. Check for hardcoded API keys, JWT secrets, database connection strings, or cloud credentials.\n")
	sb.WriteString("3. Check for container/Dockerfile flaws (running as root, missing .dockerignore, insecure exposed ports).\n")
	sb.WriteString("4. Check for code injection vulnerabilities, unvalidated input, eval(), raw SQL concatenation.\n")
	sb.WriteString("5. Classify every finding strictly into one of three severities:\n")
	sb.WriteString("   - 'danger': Critical/high risk. Known exploitable CVEs, leaked secrets, root execution, remote code execution risks. (This will block automated CI/CD deployments until overridden!)\n")
	sb.WriteString("   - 'warning': Moderate risk. Outdated non-critical packages, missing rate limits, weak defaults, prototype pollution risks.\n")
	sb.WriteString("   - 'info': Low risk / Best practice advice. Missing optional security headers, dependency version recommendations.\n")
	sb.WriteString("6. Provide actionable, concise remediation code or instructions for each finding.\n")
	sb.WriteString("7. You MUST reply ONLY with a valid, parseable JSON object matching the schema below. Do not wrap in markdown or add conversational text.\n\n")

	sb.WriteString(`### REQUIRED JSON RESPONSE SCHEMA:
{
  "summary": "Short 1-2 sentence executive security summary of the scan",
  "status": "passed" | "warning" | "danger",
  "findings": [
    {
      "id": "UNIQUE-FINDING-ID",
      "ruleId": "MATCHING-RULE-ID-OR-CUSTOM",
      "title": "Clear concise vulnerability title",
      "severity": "info" | "warning" | "danger",
      "category": "cve" | "secret" | "container" | "owasp" | "dependency",
      "description": "Detailed explanation of what the vulnerability is and how it impacts the app",
      "file": "path/to/file or package.json",
      "line": 12,
      "cve": "CVE-XXXX-XXXX (or empty if not a CVE)",
      "recommendation": "Concrete fix code or command to resolve the issue"
    }
  ],
  "checklist": [
    {
      "ruleId": "CVE-NEXT-SSRF-2024",
      "status": "pass" | "fail" | "warn",
      "note": "Checked Next.js version (14.2.15). Safe."
    }
  ]
}
`)

	return sb.String()
}
