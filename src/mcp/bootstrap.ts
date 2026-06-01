import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

const GLOBAL_DISABLE_ENV = "WHITEY_MCP_SERVER_DISABLE_AUTO_START";

function disableEnvForServer(name: string): string {
  return `WHITEY_${name.toUpperCase()}_SERVER_DISABLE_AUTO_START`;
}

export function shouldAutoStartMcpServer(name: string): boolean {
  const disableEnv = disableEnvForServer(name);
  return process.env[GLOBAL_DISABLE_ENV] !== "1" && process.env[disableEnv] !== "1";
}

export async function startStdioMcpServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function autoStartStdioMcpServer(name: string, server: Server): void {
  if (!shouldAutoStartMcpServer(name)) {
    return;
  }

  void startStdioMcpServer(server);
}
