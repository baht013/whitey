import { spawn } from "node:child_process";
import type { CopilotExecutionInput, CopilotExecutionOutput } from "../../types/index.js";

function buildCopilotArgs(prompt: string): string[] {
  if (process.env.WHITEY_COPILOT_ARGS_TEMPLATE) {
    return process.env.WHITEY_COPILOT_ARGS_TEMPLATE.split(" ").map((part) =>
      part === "{prompt}" ? prompt : part
    );
  }

  return ["--prompt", prompt];
}

export async function executeWithCopilot(input: CopilotExecutionInput): Promise<CopilotExecutionOutput> {
  const cmd = process.env.WHITEY_COPILOT_CMD || "copilot";
  const args = buildCopilotArgs(input.prompt);

  if (input.verbose) {
    process.stderr.write(`executor: ${cmd} ${args.join(" ")}\n`);
  }

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: input.cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let finished = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        stderr += `\nExecution timed out after ${input.timeoutMs}ms.`;
        child.kill("SIGTERM");

        setTimeout(() => {
          if (!finished) {
            child.kill("SIGKILL");
          }
        }, 2000);
      }
    }, input.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: Error) => {
      clearTimeout(timeout);
      finished = true;
      resolve({
        exitCode: 127,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      finished = true;
      resolve({
        exitCode: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr
      });
    });
  });
}
