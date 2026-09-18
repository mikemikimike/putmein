function resolveSpawnCommand(command, platform = process.platform) {
  if (platform === "win32" && !command.toLowerCase().endsWith(".cmd")) {
    return `${command}.cmd`;
  }
  return command;
}

module.exports = { resolveSpawnCommand };
