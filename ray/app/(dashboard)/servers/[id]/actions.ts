"use server";
import os from "os";
import fs from "fs";

export async function getLiveSystemStats() {
  let diskPercent = 0;
  try {
    const stat = fs.statfsSync("/");
    const diskTotal = stat.blocks;
    const diskFree = stat.bfree;
    diskPercent = Math.round(((diskTotal - diskFree) / diskTotal) * 100);
  } catch (e) {
    console.error("Failed to read disk stats", e);
  }

  const cpuPercent = Math.min(100, Math.round((os.loadavg()[0] / os.cpus().length) * 100));
  const memPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

  const uptimeSeconds = os.uptime();
  const d = Math.floor(uptimeSeconds / (3600 * 24));
  const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const uptime = `${d}d ${h}h ${m}m`;

  const loadAvg = os.loadavg().map(v => Number(v.toFixed(2)));

  return {
    cpu: cpuPercent,
    memory: memPercent,
    disk: diskPercent,
    uptime,
    loadAvg,
  };
}
