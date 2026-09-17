const fs = require("fs");
const path = require("path");

const rayDir = path.resolve(__dirname, "..");
const standaloneDir = path.join(rayDir, ".next", "standalone");

if (fs.existsSync(standaloneDir)) {
  const targetDirs = [standaloneDir];
  const nestedRayDir = path.join(standaloneDir, "ray");
  if (fs.existsSync(nestedRayDir)) {
    targetDirs.push(nestedRayDir);
  }

  const staticSrc = path.join(rayDir, ".next", "static");
  const publicSrc = path.join(rayDir, "public");

  for (const targetDir of targetDirs) {
    // Next.js standalone mode requires .next/static
    if (fs.existsSync(staticSrc)) {
      const staticDest = path.join(targetDir, ".next", "static");
      fs.mkdirSync(path.dirname(staticDest), { recursive: true });
      fs.cpSync(staticSrc, staticDest, { recursive: true });
    }

    // Next.js standalone mode requires public assets
    if (fs.existsSync(publicSrc)) {
      const publicDest = path.join(targetDir, "public");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.cpSync(publicSrc, publicDest, { recursive: true });
    }
  }

  // If server.js exists in nested ray directory but not at the root of standalone,
  // create a bridge server.js so direct execution of `node .next/standalone/server.js` also works.
  const rootServerJs = path.join(standaloneDir, "server.js");
  const nestedServerJs = path.join(nestedRayDir, "server.js");
  if (!fs.existsSync(rootServerJs) && fs.existsSync(nestedServerJs)) {
    fs.writeFileSync(
      rootServerJs,
      `// Auto-generated bridge for standalone Next.js server\nconst path = require("path");\nprocess.chdir(path.join(__dirname, "ray"));\nrequire("./ray/server.js");\n`
    );
  }
}

