import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatDatabaseErrorResponse } from "@/lib/db-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/auth/setup-status — Check if the platform needs first-time admin setup
export async function GET() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        password: { not: "" },
      },
      select: {
        id: true,
      },
    });

    const setupRequired = !adminUser;

    return NextResponse.json({
      setupRequired,
    });
  } catch (error: unknown) {
    const err = error as Error | undefined;
    console.error("GET /api/auth/setup-status error:", err?.message || error);
    const errorInfo = formatDatabaseErrorResponse(error);

    return NextResponse.json(
      {
        setupRequired: false,
        isDbInitError: errorInfo.isDbInitError,
        error: errorInfo.userMessage,
        command: errorInfo.command,
        hint: errorInfo.hint,
      },
      { status: errorInfo.isDbInitError ? 503 : 500 }
    );
  }
}

