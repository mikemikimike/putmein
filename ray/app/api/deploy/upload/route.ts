import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { getDeploymentsDir } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const zipFile = formData.get("zip") as File | null;
    let customName = formData.get("name") as string | null;

    if (!files?.length && !zipFile) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const baseDeployDir = await getDeploymentsDir();

    let projectName = customName || "app";

    // If zip file uploaded
    if (zipFile) {
      const rawName = zipFile.name.replace(/\.(zip|tar\.gz|tar)$/i, "");
      projectName = customName || rawName || `app-${Date.now()}`;
      const targetDir = path.join(baseDeployDir, projectName);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      fs.mkdirSync(targetDir, { recursive: true });

      const zipPath = path.join(baseDeployDir, `${projectName}-upload.zip`);
      const buffer = Buffer.from(await zipFile.arrayBuffer());
      fs.writeFileSync(zipPath, buffer);

      // Unzip using system unzip
      try {
        execSync(`unzip -o -q "${zipPath}" -d "${targetDir}"`);
      } catch (uzErr) {
        console.warn("Unzip failed, trying tar:", uzErr);
      } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      }

      // If zipped inside a single subfolder, adjust targetDir
      const innerItems = fs.readdirSync(targetDir).filter((i) => !i.startsWith("."));
      let finalDir = targetDir;
      if (innerItems.length === 1 && fs.statSync(path.join(targetDir, innerItems[0])).isDirectory()) {
        finalDir = path.join(targetDir, innerItems[0]);
      }

      return NextResponse.json({
        success: true,
        name: projectName,
        projectPath: finalDir,
      });
    }

    // If multi-file directory upload
    const firstRel = (files[0] as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    if (firstRel && !customName) {
      projectName = firstRel.split("/")[0] || "app";
    }
    const targetDir = path.join(baseDeployDir, projectName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const file of files) {
      const relPath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
      // strip top directory if present
      const cleanRel = relPath.includes("/") ? relPath.split("/").slice(1).join("/") : relPath;
      if (!cleanRel) continue;

      const filePath = path.join(targetDir, cleanRel);
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    }

    return NextResponse.json({
      success: true,
      name: projectName,
      projectPath: targetDir,
      fileCount: files.length,
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to process project files" },
      { status: 500 }
    );
  }
}
