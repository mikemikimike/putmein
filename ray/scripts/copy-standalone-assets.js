const fs = require("fs");
const path = require("path");

const rayDir = path.resolve(__dirname, "..");
const standaloneDir = path.join(rayDir, ".next", "standalone");

if (fs.existsSync(standaloneDir)) {
  // Next.js standalone mode requires .next/static inside .next/standalone/.next/static
  const staticSrc = path.join(rayDir, ".next", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }

  // Next.js standalone mode requires public inside .next/standalone/public
  const publicSrc = path.join(rayDir, "public");
  const publicDest = path.join(standaloneDir, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }
}
