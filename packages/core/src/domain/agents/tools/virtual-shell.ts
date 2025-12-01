/**
 * Virtual shell tool that emulates a tiny, safe subset of shell commands.
 * Designed for Cloudflare Worker runtime where spawning a real shell isn't possible.
 */

import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { toolBuilder, toolError, toolSuccess } from "../tool-builder";
import { direntType, resolveTmpPath, TMP_ROOT } from "./tmp-fs-helpers";

type CommandOptionValue = string | boolean;

interface ParsedInstruction {
  command: string;
  args: string[];
  options: Record<string, CommandOptionValue>;
}

const VirtualShellParamsSchema = z.object({
  instruction: z
    .string()
    .min(1, "Instruction cannot be empty")
    .describe(
      "Shell-like instruction limited to /tmp. Supported commands: pwd, ls, cat, write, rm, mkdir, stat.",
    ),
});

type VirtualShellParams = z.infer<typeof VirtualShellParamsSchema>;

const BOOLEAN_TRUE = new Set(["true", "1", "yes", "on"]);
const BOOLEAN_FALSE = new Set(["false", "0", "no", "off"]);

function tokenizeInstruction(instruction: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (let i = 0; i < instruction.length; i++) {
    const char = instruction[i];

    if (quote) {
      if (char === "\\" && i + 1 < instruction.length) {
        current += instruction[i + 1];
        i++;
        continue;
      }
      if (char === quote) {
        tokens.push(current);
        current = "";
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "\\" && i + 1 < instruction.length) {
      current += instruction[i + 1];
      i++;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (quote) {
    throw new Error(`Unterminated quote ${quote}`);
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function parseInstruction(instruction: string): ParsedInstruction {
  const tokens = tokenizeInstruction(instruction.trim());
  if (tokens.length === 0) {
    throw new Error("Instruction must include a command");
  }

  const [command, ...rest] = tokens;
  const args: string[] = [];
  const options: Record<string, CommandOptionValue> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const eqIdx = token.indexOf("=");
      if (eqIdx !== -1) {
        const name = token.slice(2, eqIdx);
        const value = token.slice(eqIdx + 1);
        options[name] = value === "" ? true : value;
        continue;
      }
      const name = token.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("-")) {
        options[name] = next;
        i++;
      } else {
        options[name] = true;
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1 && !token.startsWith("--")) {
      const flags = token.slice(1).split("");
      for (const flag of flags) {
        options[flag] = true;
      }
      continue;
    }

    args.push(token);
  }

  return { command, args, options };
}

function boolOption(
  value: CommandOptionValue | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (BOOLEAN_TRUE.has(normalized)) return true;
    if (BOOLEAN_FALSE.has(normalized)) return false;
  }
  return defaultValue;
}

function stringOption(
  value: CommandOptionValue | undefined,
  defaultValue: string,
): string {
  if (typeof value === "string" && value.length > 0) return value;
  return defaultValue;
}

function resolveDisplayPath(inputPath?: string): {
  display: string;
  absolute: string;
} {
  const candidate = inputPath ?? ".";
  const absolute = resolveTmpPath(candidate);
  return { display: candidate, absolute };
}

async function describeDirectory(absolutePath: string) {
  const entries = await readdir(absolutePath, { withFileTypes: true });
  return Promise.all(
    entries.map(async (dirent) => {
      const entryPath = resolve(absolutePath, dirent.name);
      let size: number | null = null;
      try {
        const stats = await stat(entryPath);
        size = stats.size;
      } catch {
        size = null;
      }
      return {
        name: dirent.name,
        type: direntType(dirent),
        size,
      };
    }),
  );
}

async function executeLs(args: string[]) {
  const { display, absolute } = resolveDisplayPath(args[0]);
  const entries = await describeDirectory(absolute);
  return toolSuccess("virtual_shell", {
    command: "ls",
    path: display,
    entries,
  });
}

async function executeCat(
  args: string[],
  options: ParsedInstruction["options"],
) {
  if (!args[0]) {
    throw new Error("cat requires a file path");
  }
  const encodingOption = stringOption(options.encoding, "utf8");
  if (encodingOption !== "utf8" && encodingOption !== "base64") {
    throw new Error(`Unsupported encoding ${encodingOption}`);
  }
  const encoding: SupportedEncoding = encodingOption;
  const { display, absolute } = resolveDisplayPath(args[0]);
  const buffer = await readFile(absolute);
  const content =
    encoding === "utf8" ? buffer.toString("utf8") : buffer.toString("base64");
  return toolSuccess("virtual_shell", {
    command: "cat",
    path: display,
    encoding,
    content,
    byteLength: buffer.byteLength,
  });
}

async function executeWrite(
  args: string[],
  options: ParsedInstruction["options"],
) {
  if (!args[0]) {
    throw new Error("write requires a target file path");
  }
  const encodingOption = stringOption(options.encoding, "utf8");
  if (encodingOption !== "utf8" && encodingOption !== "base64") {
    throw new Error(`Unsupported encoding ${encodingOption}`);
  }
  const encoding: SupportedEncoding = encodingOption;
  const append = boolOption(options.append ?? options.a, false);
  const dataValue = options.data ?? options.d;
  if (typeof dataValue !== "string") {
    throw new Error("write requires --data <value>");
  }
  const mkdirs = boolOption(
    options["parents"] ?? options["p"] ?? options["mkdirs"],
    true,
  );
  const { display, absolute } = resolveDisplayPath(args[0]);
  if (mkdirs) {
    await mkdir(dirname(absolute), { recursive: true });
  }
  const buffer =
    encoding === "utf8"
      ? Buffer.from(dataValue, "utf8")
      : Buffer.from(dataValue, "base64");
  await writeFile(absolute, buffer, { flag: append ? "a" : "w" });
  return toolSuccess("virtual_shell", {
    command: "write",
    path: display,
    bytesWritten: buffer.byteLength,
    append,
    encoding,
  });
}
type SupportedEncoding = "utf8" | "base64";

async function executeRm(
  args: string[],
  options: ParsedInstruction["options"],
) {
  if (!args[0]) {
    throw new Error("rm requires a path");
  }
  const recursive = boolOption(options.recursive ?? options.r, false);
  const { display, absolute } = resolveDisplayPath(args[0]);
  await rm(absolute, { recursive, force: true });
  return toolSuccess("virtual_shell", {
    command: "rm",
    path: display,
    recursive,
  });
}

async function executeMkdir(
  args: string[],
  options: ParsedInstruction["options"],
) {
  if (!args[0]) {
    throw new Error("mkdir requires a path");
  }
  const recursive = boolOption(
    options.recursive ?? options.r ?? options.p,
    true,
  );
  const { display, absolute } = resolveDisplayPath(args[0]);
  await mkdir(absolute, { recursive });
  return toolSuccess("virtual_shell", {
    command: "mkdir",
    path: display,
    recursive,
  });
}

async function executeStat(args: string[]) {
  if (!args[0]) {
    throw new Error("stat requires a path");
  }
  const { display, absolute } = resolveDisplayPath(args[0]);
  const stats = await stat(absolute);
  return toolSuccess("virtual_shell", {
    command: "stat",
    path: display,
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    modifiedAt: stats.mtime.toISOString(),
  });
}

function executePwd() {
  return toolSuccess("virtual_shell", {
    command: "pwd",
    cwd: TMP_ROOT,
  });
}

export const virtualShellTool = toolBuilder({
  name: "virtual_shell",
  description:
    "Execute limited shell-like commands (pwd, ls, cat, write, rm, mkdir, stat) scoped to /tmp. Used in Cloudflare Worker runtime.",
  parameters: VirtualShellParamsSchema,
  async execute(params: VirtualShellParams) {
    const parsed = parseInstruction(params.instruction);
    switch (parsed.command) {
      case "pwd":
        return executePwd();
      case "ls":
        return await executeLs(parsed.args);
      case "cat":
        return await executeCat(parsed.args, parsed.options);
      case "write":
        return await executeWrite(parsed.args, parsed.options);
      case "rm":
        return await executeRm(parsed.args, parsed.options);
      case "mkdir":
        return await executeMkdir(parsed.args, parsed.options);
      case "stat":
        return await executeStat(parsed.args);
      default:
        return toolError(
          "virtual_shell",
          `Unsupported command ${parsed.command}`,
        );
    }
  },
});
