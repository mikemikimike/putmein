/**
 * Domain parsing, normalization, and conflict detection utilities for Ray
 */

/**
 * Normalizes a URL or domain string to a clean hostname for comparison:
 * - strips protocol (http://, https://)
 * - strips paths, query params, hash
 * - strips port
 * - lowercases and trims
 */
export function normalizeDomain(input: string): string {
  if (!input) return "";
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, "");
  // Strip path and search
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0];
  // Strip port
  cleaned = cleaned.split(":")[0];
  return cleaned.trim();
}

/**
 * Parses a projectUrl string which may contain one or multiple comma-separated
 * or newline-separated URLs/domains into an array of clean URL strings.
 */
export function parseProjectDomains(raw?: string | null): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const results: string[] = [];

  for (const part of parts) {
    let url = part;
    if (!/^https?:\/\//i.test(url)) {
      // Default to http:// for sslip or raw IPs/domains
      url = `http://${url}`;
    }
    const norm = normalizeDomain(url);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      results.push(url);
    }
  }

  return results;
}

/**
 * Formats a list of domain strings back into a clean comma-separated projectUrl string.
 */
export function serializeProjectDomains(domains: string[]): string {
  return domains.map((d) => d.trim()).filter(Boolean).join(", ");
}

/**
 * Returns the primary (first) domain URL for opening an app or external link.
 * Falls back to localhost:<fallbackPort> if no domain is registered.
 */
export function getPrimaryProjectUrl(
  projectUrl?: string | null,
  fallbackPort?: number | null
): string | null {
  const domains = parseProjectDomains(projectUrl);
  if (domains.length > 0) {
    return domains[0];
  }
  if (fallbackPort) {
    return `http://localhost:${fallbackPort}`;
  }
  return null;
}

/**
 * Checks whether any of the candidate domains are already claimed by another project.
 */
export function findDomainConflict(
  candidateInput: string | string[],
  currentProjectId: string,
  existingProjects: Array<{ id: string; name: string; projectUrl?: string | null }>
): { hasConflict: boolean; domain?: string; projectName?: string } {
  const candidateList =
    typeof candidateInput === "string"
      ? parseProjectDomains(candidateInput)
      : candidateInput;

  const candidateHostnames = candidateList.map(normalizeDomain).filter(Boolean);

  for (const proj of existingProjects) {
    if (proj.id === currentProjectId) continue;
    const projHostnames = parseProjectDomains(proj.projectUrl).map(normalizeDomain);

    for (const ch of candidateHostnames) {
      // Don't conflict on localhost or 127.0.0.1
      if (ch === "localhost" || ch === "127.0.0.1" || ch === "") continue;

      if (projHostnames.includes(ch)) {
        return {
          hasConflict: true,
          domain: ch,
          projectName: proj.name,
        };
      }
    }
  }

  return { hasConflict: false };
}
