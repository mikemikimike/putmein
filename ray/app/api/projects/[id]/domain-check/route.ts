import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dns from "dns";
import os from "os";
import { verifyToken } from "@/lib/auth";

function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch { /* fallback */ }
  return "127.0.0.1";
}

async function detectServerIp(): Promise<{ localIp: string; publicIp: string }> {
  const localIp = getLocalIp();
  let publicIp = localIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) publicIp = data.ip;
    }
  } catch {
    // fallback
  }
  return { localIp, publicIp };
}

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
