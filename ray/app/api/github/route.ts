import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

// GET /api/github — fetch connected github account & list user repositories
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integration = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
    });

    if (!integration || !integration.accessToken) {
      return NextResponse.json({ connected: false });
    }

    // Fetch user repos using PAT
    const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", {
      headers: {
        Authorization: `token ${integration.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ray-DevOps-Deployer",
      },
    });

    let repos = [];
    if (reposRes.ok) {
      const data = await reposRes.json();
      repos = data.map((r: {
        id: number;
        name: string;
        full_name: string;
        clone_url: string;
        default_branch: string;
        private: boolean;
        language: string;
        updated_at: string;
      }) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        cloneUrl: r.clone_url,
        defaultBranch: r.default_branch || "main",
        isPrivate: r.private,
        language: r.language,
        updatedAt: r.updated_at,
      }));
    }

    return NextResponse.json({
      connected: true,
      username: integration.githubUsername,
      avatarUrl: integration.avatarUrl,
      webhookSecret: integration.webhookSecret,
      repos,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/github — connect GitHub via Personal Access Token
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token: githubPAT } = body;

    if (!githubPAT) {
      return NextResponse.json({ error: "GitHub Personal Access Token is required" }, { status: 400 });
    }

    // Verify token with GitHub
    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${githubPAT}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Ray-DevOps-Deployer",
      },
    });

    if (!ghRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub Personal Access Token" }, { status: 400 });
    }

    const ghUser = await ghRes.json();
    const webhookSecret = crypto.randomBytes(24).toString("hex");

    const existing = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
    });

    let integration;
    if (existing) {
      integration = await prisma.rayGithubIntegration.update({
        where: { id: existing.id },
        data: {
          accessToken: githubPAT,
          githubUsername: ghUser.login,
          avatarUrl: ghUser.avatar_url,
          webhookSecret,
        },
      });
    } else {
      integration = await prisma.rayGithubIntegration.create({
        data: {
          userId: user.userId,
          accessToken: githubPAT,
          githubUsername: ghUser.login,
          avatarUrl: ghUser.avatar_url,
          webhookSecret,
        },
      });
    }

    return NextResponse.json({
      connected: true,
      username: integration.githubUsername,
      avatarUrl: integration.avatarUrl,
      webhookSecret: integration.webhookSecret,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/github — disconnect GitHub account
export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.rayGithubIntegration.deleteMany({
      where: { userId: user.userId },
    });
    return NextResponse.json({ connected: false });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
