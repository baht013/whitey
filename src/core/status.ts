import { spawn } from "node:child_process";
import type { CopilotStatusCheckResult, CopilotStatusReport } from "../types.js";

function runCheck(command: string, args: string[], timeoutMs = 6000): Promise<CopilotStatusCheckResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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
        stderr += `\nCheck timed out after ${timeoutMs}ms.`;
        child.kill("SIGTERM");

        setTimeout(() => {
          if (!finished) {
            child.kill("SIGKILL");
          }
        }, 1200);
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      finished = true;
      resolve({
        ok: false,
        timedOut: false,
        exitCode: 127,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim()
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      finished = true;
      const exitCode = timedOut ? 124 : (code ?? 1);
      resolve({
        ok: exitCode === 0,
        timedOut,
        exitCode,
        stdout,
        stderr
      });
    });
  });
}

function detectAuthenticatedOutput(value: string): boolean {
  return /(authenticated|signed in|active session|you are logged in|logged in successfully)/i.test(value);
}

function detectUnauthenticatedOutput(value: string): boolean {
  return /(not authenticated|not logged in|sign in|login required|authenticate)/i.test(value);
}

function authHintFromOutput(output: string): string {
  if (detectAuthenticatedOutput(output)) {
    return "Copilot authentication looks valid.";
  }

  if (detectUnauthenticatedOutput(output)) {
    return "Copilot appears unauthenticated. Run `copilot auth login`.";
  }

  return "Unable to conclusively determine auth state from CLI output.";
}

export async function getCopilotStatus(cwd: string): Promise<CopilotStatusReport> {
  const copilotCommand = process.env.WHITEY_COPILOT_CMD || "copilot";
  const version = await runCheck(copilotCommand, ["--version"]);

  if (!version.ok) {
    return {
      cwd,
      copilotCommand,
      commandAvailable: false,
      authChecked: false,
      authenticated: false,
      authHint: "Copilot command is not available or not executable.",
      checks: {
        version,
        auth: {
          ok: false,
          timedOut: false,
          exitCode: 1,
          stdout: "",
          stderr: "Auth check skipped because command is unavailable."
        }
      }
    };
  }

  const auth = await runCheck(copilotCommand, ["auth", "status"]);
  const output = `${auth.stdout}\n${auth.stderr}`;
  const unauthenticated = detectUnauthenticatedOutput(output);
  const authenticated = !unauthenticated && (auth.ok || detectAuthenticatedOutput(output));

  return {
    cwd,
    copilotCommand,
    commandAvailable: true,
    authChecked: true,
    authenticated,
    authHint: authHintFromOutput(output),
    checks: {
      version,
      auth
    }
  };
}
