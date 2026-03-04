import { describe, expect, it } from "vitest";

import { parseListeningPids } from "../../scripts/lib/port-guard.js";

describe("parseListeningPids", () => {
  it("parses listening pids from netstat output on Windows", () => {
    const output = [
      "  TCP    0.0.0.0:8080     0.0.0.0:0      LISTENING       1234",
      "  TCP    [::]:8080        [::]:0         LISTENING       1234",
      "  TCP    127.0.0.1:5173   0.0.0.0:0      LISTENING       5678",
    ].join("\n");

    expect(parseListeningPids({ output, platform: "win32", port: 8080 })).toEqual([1234]);
  });

  it("parses listening pids from lsof output on Unix", () => {
    const output = ["1234", "5678", "1234"].join("\n");

    expect(parseListeningPids({ output, platform: "linux", port: 8080 })).toEqual([1234, 5678]);
  });

  it("returns empty array when nothing is listening", () => {
    expect(parseListeningPids({ output: "", platform: "linux", port: 8080 })).toEqual([]);
  });
});
