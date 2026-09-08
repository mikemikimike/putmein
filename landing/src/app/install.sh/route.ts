import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "install.sh");
  
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Script not found", { status: 404 });
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");

  return new NextResponse(fileContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
