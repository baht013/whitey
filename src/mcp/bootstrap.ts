import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

function disableEnvForServer(name: string): string {
  return `WHITEY_${name.toUpperCase()}_SERVER_DISABLE_AUTO_START`;
}

export function autoStartStdioMcpServer(name: string, server: Server): void {
  const disableEnv = disableEnvForServer(name);
  if (process.env[disableEnv] === "1") {
    return;
  }

  const transport = new StdioServerTransport();
  void server.connect(transport);
}
