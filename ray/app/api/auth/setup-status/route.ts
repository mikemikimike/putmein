import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  } catch (error: any) {
    console.error("GET /api/auth/setup-status error:", error?.message || error);
    // If database is not ready or error occurs, report setupRequired false with error details
    return NextResponse.json(
      {
        setupRequired: false,
        error: error?.message || "Failed to check setup status",
      },
      { status: 500 }
    );
  }
}
