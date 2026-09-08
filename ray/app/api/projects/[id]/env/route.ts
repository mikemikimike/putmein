import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface EnvVariable {
  key: string;
  value: string;
}

// Parses raw .env file string into key-value pairs
function parseEnv(content: string): EnvVariable[] {
  const vars: EnvVariable[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Strip wrapping quotes if matching
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars.push({ key, value });
  }

  return vars;
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/projects/[id]/env — read project's .env file
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, projectPath: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const envFilePath = path.join(project.projectPath, ".env");
    let rawContent = "";
    let exists = false;

    try {
      if (fs.existsSync(envFilePath)) {
        rawContent = await fs.promises.readFile(envFilePath, "utf-8");
        exists = true;
      }
    } catch (readErr) {
      console.warn("Error reading .env:", readErr);
    }

    const vars = parseEnv(rawContent);

    return NextResponse.json({
      exists,
      envPath: envFilePath,
      vars,
      rawContent,
    });
  } catch (err) {
    console.error("GET /api/projects/[id]/env:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/env — add, update, delete, or save raw .env
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, projectPath: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const { action = "set", key, value, content } = body;
    const envFilePath = path.join(project.projectPath, ".env");

    let currentContent = "";
    try {
      if (fs.existsSync(envFilePath)) {
        currentContent = await fs.promises.readFile(envFilePath, "utf-8");
      }
    } catch {
      currentContent = "";
    }

    let newContent = currentContent;

    if (action === "raw") {
      if (typeof content !== "string") {
        return NextResponse.json({ error: "Raw content string required" }, { status: 400 });
      }
      newContent = content;
    } else if (action === "delete") {
      if (!key || typeof key !== "string") {
        return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
      }
      const lines = currentContent.split(/\r?\n/);
      const filteredLines = lines.filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) return true;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const varKey = trimmed.slice(0, eqIdx).trim();
          return varKey !== key.trim();
        }
        return true;
      });
      newContent = filteredLines.join("\n");
    } else {
      // action === "set" (add or update key=value)
      if (!key || typeof key !== "string") {
        return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
      }
      const trimmedKey = key.trim();
      const trimmedVal = value !== undefined ? String(value) : "";
      const formattedVal = trimmedVal.includes(" ") || trimmedVal.includes("\n") || trimmedVal.includes("#")
        ? `"${trimmedVal.replace(/"/g, '\\"')}"`
        : trimmedVal;

      const targetEntry = `${trimmedKey}=${formattedVal}`;
      const keyPattern = new RegExp(`^([\\t ]*${escapeRegExp(trimmedKey)}[\\t ]*=).*$`, "m");

      if (keyPattern.test(currentContent)) {
        newContent = currentContent.replace(keyPattern, targetEntry);
      } else {
        const trailingNewline = currentContent.length > 0 && !currentContent.endsWith("\n") ? "\n" : "";
        newContent = `${currentContent}${trailingNewline}${targetEntry}\n`;
      }
    }

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(envFilePath), { recursive: true });
    // Write atomically
    await fs.promises.writeFile(envFilePath, newContent, "utf-8");

    const parsedVars = parseEnv(newContent);

    return NextResponse.json({
      success: true,
      envPath: envFilePath,
      vars: parsedVars,
      rawContent: newContent,
    });
  } catch (err) {
    console.error("POST /api/projects/[id]/env:", err);
    return NextResponse.json({ error: "Failed to update .env" }, { status: 500 });
  }
}
