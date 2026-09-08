import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// POST /api/cicd/poll — checks remote GitHub repos for new commits asynchronously without blocking
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only poll pipelines for projects that are actively added to the local machine (RayMonitorProject)
    const monitorProjects = await prisma.rayMonitorProject.findMany({
      where: { userId: user.userId },
    });

    const localProjectMap = new Map<string, string>(); // lowerName -> projectPath
    for (const p of monitorProjects) {
      if (p.projectPath && fs.existsSync(p.projectPath)) {
        localProjectMap.set(p.name.toLowerCase(), p.projectPath);
      }
    }

    if (localProjectMap.size === 0) {
      return NextResponse.json({ message: "No local projects to poll", triggered: [] });
    }

    const pipelines = await prisma.rayPipeline.findMany({
      where: { userId: user.userId, autoDeploy: true },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const validPipelines = pipelines.filter((pipe) => localProjectMap.has(pipe.name.toLowerCase()));
    if (validPipelines.length === 0) {
      return NextResponse.json({ message: "No active local pipelines", triggered: [] });
    }

    const { getEffectiveGitHubToken } = await import("@/lib/github-app");
    const effectiveToken = await getEffectiveGitHubToken(user.userId);
    const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "" };

    const triggered = [];

    for (const pipe of validPipelines) {
      const targetDir = localProjectMap.get(pipe.name.toLowerCase());
      if (!targetDir || !fs.existsSync(targetDir)) continue;

      try {
        let authUrl = pipe.repoUrl;
        if (effectiveToken && authUrl.includes("github.com")) {
          authUrl = authUrl.replace(/https:\/\/(?:x-access-token:[^@]+@)?github\.com\//i, `https://x-access-token:${effectiveToken}@github.com/`);
        }

        // Check remote commit hash asynchronously
        const { stdout: remoteOut } = await execFileAsync(
          "git",
          ["ls-remote", authUrl, `refs/heads/${pipe.branch || "main"}`],
          { env: gitEnv, timeout: 5000 }
        );

        const match = remoteOut.trim().match(/^([a-f0-9]{40})/i);
        if (!match) continue;

        const latestRemoteCommit = match[1].slice(0, 7);
        const lastRunCommit = pipe.runs[0]?.commitHash;

        // If there's a new commit that hasn't been run yet, and no active run is already building:
        const isAlreadyRunning = pipe.runs[0]?.status === "running" && (Date.now() - new Date(pipe.runs[0].createdAt).getTime() < 90000);
        if (latestRemoteCommit && latestRemoteCommit !== lastRunCommit && latestRemoteCommit !== "push-tr" && !isAlreadyRunning) {
          let commitMsg = `New commit ${latestRemoteCommit} on ${pipe.branch}`;
          try {
            await execFileAsync("git", ["-C", targetDir, "fetch", "origin", pipe.branch || "main"], { env: gitEnv, timeout: 10000 });
            await execFileAsync("git", ["-C", targetDir, "reset", "--hard", `origin/${pipe.branch || "main"}`], { env: gitEnv, timeout: 5000 });
            const { stdout: logOut } = await execFileAsync("git", ["-C", targetDir, "log", "-1", "--pretty=%B"], { env: gitEnv, timeout: 3000 });
            if (logOut.trim()) commitMsg = logOut.trim();
          } catch { /* proceed */ }

          // Create PipelineRun
          const newRun = await prisma.rayPipelineRun.create({
            data: {
              pipelineId: pipe.id,
              commitHash: latestRemoteCommit,
              commitMessage: commitMsg,
              author: "Git Auto-Sync",
              status: "running",
              stages: JSON.stringify([
                { name: "Git Remote Detected", status: "success", durationMs: 100 },
                { name: "Docker Build & Deploy", status: "running", durationMs: 0 },
              ]),
              logs: `Detected new commit on ${pipe.repoUrl} (${pipe.branch})\nCommit: ${latestRemoteCommit} - ${commitMsg}\nStarting container build...\n`,
            },
          });

          await prisma.rayPipeline.update({
            where: { id: pipe.id },
            data: { status: "running", lastRunAt: new Date() },
          });

          // Trigger Brain deployment asynchronously and track stream to finalize status
          (async () => {
            try {
              const res = await fetch(`${BRAIN_URL}/v1/deploy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.userId,
                  name: pipe.name,
                  projectPath: targetDir,
                  sourceType: "github",
                  repoUrl: pipe.repoUrl,
                  branch: pipe.branch,
                  port: pipe.port || 3000,
                }),
                signal: AbortSignal.timeout(120000),
              });

              if (!res.ok) {
                const errTxt = await res.text().catch(() => "Deploy service error");
                await prisma.rayPipelineRun.update({
                  where: { id: newRun.id },
                  data: {
                    status: "failed",
                    logs: `Deploy failed: ${errTxt}`,
                  },
                });
                await prisma.rayPipeline.update({
                  where: { id: pipe.id },
                  data: { status: "failed" },
                });
                return;
              }

              // Read response stream to observe final outcome
              const reader = res.body?.getReader();
              if (reader) {
                const decoder = new TextDecoder();
                let accumulatedLogs = "";
                let isSuccess = false;
                let isError = false;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  accumulatedLogs += chunk;
                  if (chunk.includes('"step":"complete"')) isSuccess = true;
                  if (chunk.includes('"status":"error"') || chunk.includes('"step":"failed"')) isError = true;
                }

                const finalStatus = isSuccess ? "success" : (isError ? "failed" : "success");
                await prisma.rayPipelineRun.update({
                  where: { id: newRun.id },
                  data: {
                    status: finalStatus,
                    logs: accumulatedLogs.slice(0, 5000),
                  },
                });
                await prisma.rayPipeline.update({
                  where: { id: pipe.id },
                  data: { status: finalStatus },
                });
              }
            } catch (deployErr) {
              await prisma.rayPipelineRun.update({
                where: { id: newRun.id },
                data: {
                  status: "failed",
                  logs: `Build failed: ${(deployErr as Error).message}`,
                },
              }).catch(() => {});
              await prisma.rayPipeline.update({
                where: { id: pipe.id },
                data: { status: "failed" },
              }).catch(() => {});
            }
          })();

          triggered.push({ pipelineId: pipe.id, name: pipe.name, commitHash: latestRemoteCommit });
        }
      } catch (pipeErr) {
        console.warn(`Could not poll git remote for ${pipe.name}:`, (pipeErr as Error).message);
      }
    }

    return NextResponse.json({ success: true, triggered });
  } catch (err) {
    console.error("POST /api/cicd/poll:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
