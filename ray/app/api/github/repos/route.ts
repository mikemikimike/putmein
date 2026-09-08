import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchAllAccessibleRepos } from "@/lib/github-app";

// GET /api/github/repos — list repositories from GitHub (both App & Token)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const integration = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
    });

    if (!integration || !integration.accessToken) {
      return NextResponse.json({ connected: false, repos: [] });
    }

    const reposData = await fetchAllAccessibleRepos(user.userId);

    const repos = reposData.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      description: r.description || "",
      isPrivate: r.private || false,
      language: r.language || "",
      defaultBranch: r.default_branch || "main",
      updatedAt: r.updated_at,
      stars: r.stargazers_count || 0,
    }));

    return NextResponse.json({ connected: true, repos });
  } catch (err) {
    console.error("GET /api/github/repos:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
