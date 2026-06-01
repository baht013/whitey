import readline from "node:readline";
import type { RiskAssessment } from "../types/index.js";

const RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(rm|del|remove)\b/i, reason: "delete operation keyword detected" },
  { pattern: /\b(chmod|chown|sudo)\b/i, reason: "privileged shell operation keyword detected" },
  { pattern: /\b(write|modify|overwrite|patch|edit)\b/i, reason: "file write intent keyword detected" },
  { pattern: /\b(shell|bash|zsh|terminal|command)\b/i, reason: "shell execution intent keyword detected" }
];

export function assessRisk(prompt: string): RiskAssessment {
  const reasons = RISK_PATTERNS.filter((entry) => entry.pattern.test(prompt)).map((entry) => entry.reason);
  return { risky: reasons.length > 0, reasons };
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function requestApproval(options: {
  prompt: string;
  nonInteractive: boolean;
  assumeYes: boolean;
}): Promise<{ approved: boolean; reason?: string }> {
  const assessment = assessRisk(options.prompt);
  if (!assessment.risky) {
    return { approved: true };
  }

  if (options.assumeYes) {
    return { approved: true, reason: "assume-yes enabled" };
  }

  if (options.nonInteractive) {
    return { approved: false, reason: "approval required but non-interactive mode is enabled" };
  }

  const answer = await ask(
    `Risky intent detected (${assessment.reasons.join(", ")}). Approve execution? [y/N]: `
  );
  const approved = /^y(es)?$/i.test(answer);
  return approved ? { approved: true } : { approved: false, reason: "user denied approval" };
}
