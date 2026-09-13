import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dns from "dns";
import { verifyToken } from "@/lib/auth";
import { detectServerIp } from "@/lib/network";

// GET /api/projects/[id]/domain-check?domain=...
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawDomain = req.nextUrl.searchParams.get("domain") || "";
    // Clean hostname: strip http://, https://, paths, ports
    const cleanDomain = rawDomain
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split(":")[0]
      .trim();

    if (!cleanDomain) {
      return NextResponse.json({ error: "Domain parameter required" }, { status: 400 });
    }

    const { localIp, publicIp } = await detectServerIp();
    const validServerIps = new Set([publicIp, localIp, "127.0.0.1"]);

    let resolvedIps: string[] = [];
    let resolved = false;
    let errorMessage: string | null = null;

    try {
      resolvedIps = await dns.promises.resolve4(cleanDomain);
      resolved = resolvedIps.length > 0;
    } catch (err: any) {
      errorMessage = err.code || err.message || "DNS lookup failed";
    }

    const matchesServerIp = resolvedIps.some((ip) => validServerIps.has(ip));

    return NextResponse.json({
      domain: cleanDomain,
      resolved,
      resolvedIps,
      matchesServerIp,
      serverIps: Array.from(validServerIps),
      error: errorMessage,
    });
  } catch (err) {
    console.error("GET /api/projects/[id]/domain-check:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
