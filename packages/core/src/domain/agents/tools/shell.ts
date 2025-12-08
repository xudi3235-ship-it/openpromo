/**
 * Shell tool for video generation agent.
 * Ported from Python: src/openai_agent/tools/shell.py
 *
 * Uses the OpenAI Agents SDK shellTool with a custom Shell implementation.
 */

import { exec } from "node:child_process";
import {
  type Shell,
  type ShellAction,
  type ShellOutputResult,
  type ShellResult,
  shellTool,
} from "@openai/agents";

/**
 * Default working directory for shell commands.
 * All commands should run inside /tmp to ensure isolation.
 */
const DEFAULT_CWD = "/tmp"; // cloudflare worker vfs. it does NOT access local fs

/**
 * Maximum output length to prevent context overflow.
 */
const MAX_OUTPUT_LENGTH = 10000;

/**
 * Shell executor implementation for video generation agent.
 * Executes commands with timeout support and output truncation.
 * NOT in use yet, since worker env does not support child_process exec.
 */
export class VideoGenShell implements Shell {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? DEFAULT_CWD;
  }

  async run(action: ShellAction): Promise<ShellResult> {
    const outputs: ShellResult["output"] = [];
    const timeoutMs = action.timeoutMs ?? 30000; // Default 30s timeout

    for (const command of action.commands) {
      try {
        const { stdout, stderr } = await this.executeCommand(
          command,
          timeoutMs,
        );

        outputs.push({
          stdout: this.truncateOutput(stdout),
          stderr: this.truncateOutput(stderr),
        } as ShellOutputResult);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if it's a timeout error
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("TIMEOUT")
        ) {
          outputs.push({
            outcome: {
              type: "timeout",
            },
            stderr: `Error: Command timed out after ${timeoutMs} ms`,
            stdout: "",
          });
          break; // Stop executing remaining commands on timeout
        }

        // Handle other execution errors
        outputs.push({
          outcome: {
            type: "exit",
            exitCode: 1,
          },
          stderr: `Error: ${this.truncateOutput(errorMessage)}`,
          stdout: "",
        });
      }
    }

    return {
      output: outputs,
      maxOutputLength: MAX_OUTPUT_LENGTH,
      providerData: {
        workingDirectory: this.cwd,
      },
    };
  }

  private async executeCommand(
    command: string,
    timeoutMs: number,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = exec(
        command,
        {
          cwd: this.cwd,
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        },
        (error, stdout, stderr) => {
          if (error) {
            // If there's output despite the error, include it
            if (stdout || stderr) {
              resolve({
                stdout: stdout || "",
                stderr: stderr || error.message,
              });
            } else {
              reject(error);
            }
          } else {
            resolve({ stdout, stderr });
          }
        },
      );

      // Handle process timeout
      child.on("error", (err) => {
        reject(err);
      });
    });
  }

  private truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_LENGTH) {
      return output;
    }
    const half = Math.floor(MAX_OUTPUT_LENGTH / 2);
    return `${output.slice(0, half)}\n...[truncated ${output.length - MAX_OUTPUT_LENGTH} characters]...\n${output.slice(-half)}`;
  }
}

/**
 * Create a shell tool instance for the video generation agent.
 *
 * @param cwd - Working directory for shell commands (defaults to ./tmp)
 * @param needsApproval - Whether commands need approval (defaults to false for automated use)
 */
export function createShellTool(options?: {
  cwd?: string;
  needsApproval?: boolean;
}) {
  const shell = new VideoGenShell(options?.cwd);

  return shellTool({
    shell,
    needsApproval: options?.needsApproval ?? false,
  });
}

/**
 * Default shell tool instance for video generation.
 * Pre-configured with ./tmp as working directory and no approval required.
 */
export const videoGenShellTool = createShellTool();
