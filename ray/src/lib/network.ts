import os from "os";
import net from "net";

export interface ServerNetworkInfo {
  localIp: string;
  publicIp: string;
  isPrivateNetwork: boolean;
  isPubliclyExposed: boolean;
}

let cachedNetworkInfo: { data: ServerNetworkInfo; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute cache

export function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    /* fallback */
  }
  return "127.0.0.1";
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (
    ip === "127.0.0.1" ||
    ip === "localhost" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.")
  ) {
    return true;
  }
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

/**
 * Probes a specific IP and port via TCP handshake to check if inbound connections
 * from the public internet actually reach this machine or are blocked by NAT/firewall.
 */
export function probeTcpPort(ip: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on("timeout", () => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on("error", () => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(false);
      }
    });

    try {
      socket.connect(port, ip);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Probe via HTTP request to verify if a web server responds on the public IP and port.
 */
export async function probeHttpPort(ip: string, port: number, timeoutMs = 1200): Promise<boolean> {
  try {
    const res = await fetch(`http://${ip}:${port}/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

/**
 * Accurately detects whether this machine is on a private network (local computer, home/office LAN)
 * or is a publicly exposed server with direct internet accessibility.
 *
 * Detection rules:
 * 1. If local interface IPv4 is itself a public, routable IP (!isPrivateIp(localIp)),
 *    the machine interface is directly on the public internet (e.g. standard Linux VPS).
 * 2. If local interface is a private IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.0.0.1),
 *    the machine is behind NAT/router. It is considered a local computer UNLESS an active probe
 *    to publicIp on dashboard ports (4567, 3000) successfully connects (e.g. 1:1 NAT cloud Elastic IP or port forwarding).
 */
export async function detectServerIp(forceRefresh = false): Promise<ServerNetworkInfo> {
  const now = Date.now();
  if (!forceRefresh && cachedNetworkInfo && now - cachedNetworkInfo.timestamp < CACHE_TTL_MS) {
    return cachedNetworkInfo.data;
  }

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
    // lookup timed out or network offline
  }

  const isLocalPrivate = isPrivateIp(localIp);
  let isPubliclyExposed = false;

  if (!isLocalPrivate && !isPrivateIp(publicIp) && localIp !== "127.0.0.1") {
    // Direct public IP interface (e.g. DigitalOcean, Hetzner, Vultr, bare-metal server)
    isPubliclyExposed = true;
  } else if (!isPrivateIp(publicIp) && publicIp !== "127.0.0.1") {
    // Local interface is private (192.168.x.x, 10.x.x.x, etc.).
    // Verify external reachability by actively probing dashboard ports (4567, 3000, process.env.PORT, 80, 443).
    // If incoming connections reach the port from the public IP, the server is exposed.
    // Otherwise it is behind a standard NAT router on a local computer.
    const envPort = Number(process.env.PORT);
    const portsToProbe = [4567, envPort, 3000, 80, 443].filter(
      (p, i, a): p is number => !!p && p > 0 && a.indexOf(p) === i
    );

    const probeResults = await Promise.all(
      portsToProbe.map(async (port) => {
        const tcpSuccess = await probeTcpPort(publicIp, port, 1000);
        if (tcpSuccess) return true;
        const httpSuccess = await probeHttpPort(publicIp, port, 1000);
        return httpSuccess;
      })
    );

    if (probeResults.some(Boolean)) {
      isPubliclyExposed = true;
    }
  }

  const result: ServerNetworkInfo = {
    localIp,
    publicIp,
    isPrivateNetwork: isLocalPrivate,
    isPubliclyExposed,
  };

  cachedNetworkInfo = { data: result, timestamp: now };
  return result;
}

/**
 * Determines whether a request host refers directly to the Ray dashboard
 * (e.g. localhost, 127.0.0.1, or direct server IP) as opposed to a project domain.
 */
export function isDashboardHost(hostHeader: string): boolean {
  if (!hostHeader) return true;
  const host = hostHeader.split(":")[0].toLowerCase().trim();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }
  // Any raw IPv4 or IPv6 address is direct IP access to the dashboard
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) {
    return true;
  }
  return false;
}
