import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeDomain, parseProjectDomains } from "@/lib/domains";

export const runtime = "nodejs";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// Fast in-memory cache for resolved domain upstreams
interface CachedResolution {
  found: boolean;
  projectId?: string;
  projectName?: string;
  port?: number;
  upstream?: string;
  timestamp: number;
}

const resolutionCache = new Map<string, CachedResolution>();
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function GET(req: NextRequest) {
  try {
    const rawHost = req.nextUrl.searchParams.get("host") || "";
    const cleanHost = normalizeDomain(rawHost);

    if (!cleanHost) {
      return NextResponse.json({ found: false, error: "Missing host parameter" }, { status: 400 });
    }

    // Check cache
    const now = Date.now();
    const cached = resolutionCache.get(cleanHost);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached);
    }

    // 1. Fetch all monitor projects with their projectUrls
    const projects = await prisma.rayMonitorProject.findMany({
      select: {
        id: true,
        name: true,
        projectUrl: true,
        status: true,
        managedPid: true,
      },
    });

    let matchedProject: (typeof projects)[0] | null = null;
    for (const p of projects) {
      const domains = parseProjectDomains(p.projectUrl);
      const hostnames = domains.map(normalizeDomain);
      if (hostnames.includes(cleanHost)) {
        matchedProject = p;
        break;
      }
    }

    if (!matchedProject) {
      const notFoundResult: CachedResolution = { found: false, timestamp: now };
      resolutionCache.set(cleanHost, notFoundResult);
      return NextResponse.json(notFoundResult);
    }

    // 2. Resolve target upstream port
    let targetPort: number | null = null;

    // Check if projectUrl has a port embedded
    if (matchedProject.projectUrl) {
      const portMatch = matchedProject.projectUrl.match(/:(\d+)/);
      if (portMatch) {
        const pNum = parseInt(portMatch[1], 10);
        if (pNum > 0 && pNum !== 80 && pNum !== 443 && pNum !== 3000 && pNum !== 4567) {
          targetPort = pNum;
        }
      }
    }

    // Check deployment hostPort
    if (!targetPort) {
      const dep = await prisma.rayDeployment.findFirst({
        where: {
          OR: [
            { projectId: matchedProject.id },
            { name: matchedProject.name },
            { name: matchedProject.name.toLowerCase() },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { hostPort: true },
      });
      if (dep?.hostPort) {
        targetPort = dep.hostPort;
      }
    }

    // Check running containers via Brain
    if (!targetPort) {
      try {
        const cRes = await fetch(`${BRAIN_URL}/v1/containers`, { signal: AbortSignal.timeout(1000) });
        if (cRes.ok) {
          const cData = await cRes.json();
          const baseName = matchedProject.name.toLowerCase();
          const container = (cData.containers || []).find((c: any) => {
            const cName = (c.name || "").toLowerCase();
            return cName.includes("ray-" + baseName) || cName === baseName || cName.includes(baseName);
          });
          if (container?.port) {
            targetPort = container.port;
          }
        }
      } catch {
        /* Brain offline */
      }
    }

    const result: CachedResolution = {
      found: true,
      projectId: matchedProject.id,
      projectName: matchedProject.name,
      port: targetPort || undefined,
      upstream: targetPort ? `http://127.0.0.1:${targetPort}` : undefined,
      timestamp: now,
    };

    resolutionCache.set(cleanHost, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/domains/resolve error:", err);
    return NextResponse.json({ found: false, error: "Internal error" }, { status: 500 });
  }
}
