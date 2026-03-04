import { execSync, spawnSync } from "node:child_process";

function readCommandOutput(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    const status = typeof error?.status === "number" ? error.status : null;
    if (status === 1) {
      return "";
    }

    throw error;
  }
}

function toUniquePositiveIntegers(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) {
      continue;
    }

    seen.add(parsed);
    result.push(parsed);
  }

  return result;
}

function parseWindowsNetstatPids(output, port) {
  const lines = output.split(/\r?\n/);
  const pidCandidates = [];

  for (const line of lines) {
    if (!line.includes("LISTENING")) {
      continue;
    }

    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }

    const parts = normalized.split(" ");
    if (parts.length < 5) {
      continue;
    }

    const localAddress = parts[1];
    if (!localAddress.endsWith(`:${port}`)) {
      continue;
    }

    pidCandidates.push(parts.at(-1));
  }

  return toUniquePositiveIntegers(pidCandidates);
}

function parseUnixLsofPids(output) {
  const pidCandidates = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return toUniquePositiveIntegers(pidCandidates);
}

export function parseListeningPids({ output, platform, port }) {
  if (!output.trim()) {
    return [];
  }

  if (platform === "win32") {
    return parseWindowsNetstatPids(output, port);
  }

  return parseUnixLsofPids(output);
}

export function getListeningPids(port, platform = process.platform) {
  if (platform === "win32") {
    const output = readCommandOutput("netstat -ano -p tcp");
    return parseListeningPids({ output, platform, port });
  }

  const output = readCommandOutput(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`);
  return parseListeningPids({ output, platform, port });
}

function forceKillOnWindows(pid) {
  const result = spawnSync("taskkill", ["/PID", String(pid), "/F", "/T"], {
    stdio: "ignore",
  });

  return result.status === 0;
}

function forceKillOnUnix(pid) {
  const result = spawnSync("kill", ["-9", String(pid)], {
    stdio: "ignore",
  });

  return result.status === 0;
}

export function forceKillPids(pids, platform = process.platform) {
  const uniquePids = toUniquePositiveIntegers(pids);
  const killed = [];

  for (const pid of uniquePids) {
    const ok = platform === "win32" ? forceKillOnWindows(pid) : forceKillOnUnix(pid);
    if (ok) {
      killed.push(pid);
    }
  }

  return killed;
}

export function ensurePortAvailable(port, platform = process.platform) {
  const pids = getListeningPids(port, platform);
  if (pids.length === 0) {
    return [];
  }

  return forceKillPids(pids, platform);
}
