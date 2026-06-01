import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { buildMemoryServerTools, handleMemoryToolCall } from "./memory-tools.js";

export function createMemoryMcpServer(): Server {
  const server = new Server({ name: "whitey-memory", version: "0.1.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: buildMemoryServerTools() }));
  server.setRequestHandler(CallToolRequestSchema, handleMemoryToolCall);
  return server;
}
