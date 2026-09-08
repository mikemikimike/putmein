import crypto from "crypto";
import prisma from "@/lib/prisma";

export interface GitHubAppData {
  appId?: string | number;
  slug?: string;
  pem?: string;
  clientId?: string;
  clientSecret?: string;
  installationId?: string | number;
  token?: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

/**
 * Generates an RS256-signed JWT for the GitHub App using its Private Key (pem).
 */
export function generateAppJwt(appId: string | number, pem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const payload = JSON.stringify({
    iat: now - 60,
    exp: now + 9 * 60, // 9 minutes
    iss: String(appId),
  });

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  sign.end();
  const signature = sign.sign(pem, "base64url");

  return `${unsignedToken}.${signature}`;
}

/**
 * Finds or fetches the installation ID for the GitHub App.
 */
export async function getAppInstallationId(appId: string | number, pem: string, ownerLogin?: string): Promise<string | number | null> {
  try {
    const jwt = generateAppJwt(appId, pem);
    const res = await fetch("https://api.github.com/app/installations", {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ray-Cloud",
      },
    });

    if (!res.ok) return null;
    const installations = await res.json();
    if (!Array.isArray(installations) || installations.length === 0) return null;

    if (ownerLogin) {
      const match = installations.find((i: any) => i.account?.login?.toLowerCase() === ownerLogin.toLowerCase());
      if (match) return match.id;
    }

    return installations[0].id;
  } catch {
    return null;
  }
}

/**
 * Generates a short-lived Installation Access Token from GitHub App credentials.
 */
export async function getInstallationToken(appId: string | number, pem: string, installationId: string | number): Promise<string | null> {
  try {
    const jwt = generateAppJwt(appId, pem);
    const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ray-Cloud",
      },
    });

    if (!res.ok) {
      console.error("Failed to generate installation token:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.token;
  } catch (err) {
    console.error("getInstallationToken error:", err);
    return null;
  }
}

/**
 * Returns a valid GitHub Access Token for a user (either App Installation Token or Personal Access Token).
 */
export async function getEffectiveGitHubToken(userId: string): Promise<string | null> {
  const integration = await prisma.rayGithubIntegration.findFirst({
    where: { userId },
  });

  if (!integration || !integration.accessToken) return null;

  // If token is a personal access token (starts with ghp_ or github_pat_)
  if (integration.accessToken.startsWith("ghp_") || integration.accessToken.startsWith("github_pat_")) {
    return integration.accessToken;
  }

  // If token data is a stored JSON App config
  try {
    const appData = JSON.parse(integration.accessToken);
    if (appData.appId && appData.pem) {
      let instId = appData.installationId;
      if (!instId) {
        instId = await getAppInstallationId(appData.appId, appData.pem, integration.githubUsername || undefined);
        if (instId) {
          appData.installationId = instId;
          await prisma.rayGithubIntegration.update({
            where: { id: integration.id },
            data: { accessToken: JSON.stringify(appData) },
          }).catch(() => {});
        }
      }
      if (instId) {
        return await getInstallationToken(appData.appId, appData.pem, instId);
      }
    }
  } catch {
    // Not JSON
  }

  return null;
}

/**
 * Fetches all repositories (public and private) accessible via the user's GitHub integration.
 */
export async function fetchAllAccessibleRepos(userId: string): Promise<any[]> {
  const integration = await prisma.rayGithubIntegration.findFirst({
    where: { userId },
  });

  if (!integration || !integration.accessToken) return [];

  // Try App Installation Token first
  const effectiveToken = await getEffectiveGitHubToken(userId);
  if (effectiveToken) {
    // 1. If it's an installation token (starts with ghs_), use installation/repositories
    if (effectiveToken.startsWith("ghs_")) {
      try {
        const instRes = await fetch("https://api.github.com/installation/repositories?per_page=100", {
          headers: {
            Authorization: `token ${effectiveToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Ray-Cloud",
          },
        });
        if (instRes.ok) {
          const data = await instRes.json();
          if (Array.isArray(data.repositories)) {
            return data.repositories;
          }
        }
      } catch { /* fallback */ }
    }

    // 2. If it's a personal access token, query /user/repos
    try {
      const userRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&type=all", {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Ray-Cloud",
        },
      });
      if (userRes.ok) {
        const data = await userRes.json();
        if (Array.isArray(data)) return data;
      }
    } catch { /* fallback */ }
  }

  // 3. Fallback: User public repos
  if (integration.githubUsername) {
    try {
      const pubRes = await fetch(`https://api.github.com/users/${integration.githubUsername}/repos?sort=updated&per_page=100`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Ray-Cloud",
        },
      });
      if (pubRes.ok) {
        const data = await pubRes.json();
        if (Array.isArray(data)) return data;
      }
    } catch { /* silent */ }
  }

  return [];
}
