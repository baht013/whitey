import process from "node:process";
import { startStdioMcpServer } from "../mcp/bootstrap.js";

type McpServerName = "memory";

async function withScopedEnv<T>(key: string, value: string, work: () => Promise<T>): Promise<T> {
  const previous = process.env[key];
  process.env[key] = value;
  try {
    return await work();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

const SERVER_LOADERS: Record<McpServerName, () => Promise<{ start: () => Promise<void> }>> = {
  memory: async () =>
    withScopedEnv("WHITEY_MCP_SERVER_DISABLE_AUTO_START", "1", async () => {
      const memoryServerModule = await import("../mcp/memory-server.js");
      const server = memoryServerModule.createMemoryMcpServer();
      return {
        start: async () => startStdioMcpServer(server)
      };
    })
};

function printErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

async function waitUntilStopped(): Promise<void> {
  await new Promise<void>((resolve) => {
    const onExit = (): void => resolve();
    process.once("SIGINT", onExit);
    process.once("SIGTERM", onExit);
    process.stdin.once("end", onExit);
    process.stdin.once("close", onExit);
  });
}

export async function runMcpServeCommand(serverName: string | undefined): Promise<number> {
  if (!serverName) {
    printErr("mcp-serve requires a server name (supported: memory).");
    return 2;
  }

  if (!(serverName in SERVER_LOADERS)) {
    printErr(`Unknown MCP server: ${serverName}`);
    return 2;
  }

  const loader = SERVER_LOADERS[serverName as McpServerName];
  const server = await loader();
  await server.start();
  await waitUntilStopped();
  return 0;
}
