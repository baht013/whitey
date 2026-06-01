import { autoStartStdioMcpServer } from "./bootstrap.js";
import { createMemoryMcpServer } from "./memory-stdio.js";

export { createMemoryMcpServer } from "./memory-stdio.js";
export { buildMemoryServerTools, extractNotepadSection, handleMemoryToolCall, readProjectMemory } from "./memory-tools.js";

const server = createMemoryMcpServer();
autoStartStdioMcpServer("memory", server);
