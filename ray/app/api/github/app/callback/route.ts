import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAppInstallationId } from "@/lib/github-app";

// GET /api/github/app/callback?code=... OR ?installation_id=...
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const installationId = req.nextUrl.searchParams.get("installation_id");

    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Handle installation callback (GitHub redirects here after app is installed)
    if (installationId) {
      const existing = await prisma.rayGithubIntegration.findFirst({
        where: { userId: user.userId },
      });
      if (existing && existing.accessToken) {
        try {
          const appConfig = JSON.parse(existing.accessToken);
          appConfig.installationId = installationId;
          await prisma.rayGithubIntegration.update({
            where: { id: existing.id },
            data: { accessToken: JSON.stringify(appConfig), updatedAt: new Date() },
          });
        } catch { /* not json */ }
      }
      return NextResponse.redirect(new URL("/github?connected=true", req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/github?error=missing_code", req.url));
    }

    // Convert code to app configuration
    const convRes = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ray-Cloud",
      },
    });

    if (!convRes.ok) {
      console.error("Manifest conversion error:", await convRes.text());
      return NextResponse.redirect(new URL("/github?error=conversion_failed", req.url));
    }

    const appData = await convRes.json();
    const ownerName = appData.owner?.login || appData.name || "GitHub User";
    const avatarUrl = appData.owner?.avatar_url || `https://github.com/${ownerName}.png`;

    // Try finding existing installation
    let foundInstId: string | number | null = null;
    if (appData.id && appData.pem) {
      foundInstId = await getAppInstallationId(appData.id, appData.pem, ownerName);
    }

    const storedAppConfig = JSON.stringify({
      appId: appData.id,
      slug: appData.slug,
      pem: appData.pem,
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
      installationId: foundInstId || undefined,
    });

    // Save integration
    const existing = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
    });

    if (existing) {
      await prisma.rayGithubIntegration.update({
        where: { id: existing.id },
        data: {
          githubUsername: ownerName,
          accessToken: storedAppConfig,
          avatarUrl,
          webhookSecret: appData.webhook_secret || null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.rayGithubIntegration.create({
        data: {
          userId: user.userId,
          githubUsername: ownerName,
          accessToken: storedAppConfig,
          avatarUrl,
          webhookSecret: appData.webhook_secret || null,
        },
      });
    }

    // If app is not yet installed on repos, redirect user to 1-click install page on GitHub
    if (!foundInstId && appData.slug) {
      return NextResponse.redirect(new URL(`https://github.com/apps/${appData.slug}/installations/new`));
    }

    return NextResponse.redirect(new URL("/github?connected=true", req.url));
  } catch (err) {
    console.error("GET /api/github/app/callback:", err);
    return NextResponse.redirect(new URL("/github?error=server_error", req.url));
  }
}
