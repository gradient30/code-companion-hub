import { spawn } from "node:child_process";
import path from "node:path";

import { ensurePortAvailable } from "./lib/port-guard.js";

const DEFAULT_PORT = 8080;

function startVite(port) {
  const viteBin = path.resolve(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin, "--port", String(port), "--strictPort"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

const port = DEFAULT_PORT;
const killedPids = ensurePortAvailable(port);

if (killedPids.length > 0) {
  console.log(`[dev] Port ${port} was occupied. Force-killed PID(s): ${killedPids.join(", ")}.`);
}

startVite(port);
