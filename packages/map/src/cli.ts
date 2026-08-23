#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { runRegister } from "./register.js";
import { runStatus } from "./status.js";
import { runUnregister } from "./unregister.js";

function printUsage(): void {
  process.stdout.write(`Usage: engawa-map <command> [options]

Commands:
  register    Register this site with the Distribution Map
  status      Show registration status
  unregister  Delist this site from the Distribution Map

Options:
  --dry-run   Show registration payload without network or writes (register only)
  --yes       Skip interactive confirmation (register only)
`);
}

export async function runCli(argv: string[]): Promise<number> {
  const args = [...argv];
  const command = args.shift();

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return command ? 0 : 1;
  }

  const dryRun = args.includes("--dry-run");
  const yes = args.includes("--yes");

  if (args.some((arg) => arg === "--token" || arg.startsWith("--token="))) {
    process.stderr.write("The --token flag is not supported; use ENGAWA_MAP_TOKEN instead.\n");
    return 1;
  }

  const unknownFlags = args.filter(
    (arg) => arg.startsWith("--") && arg !== "--dry-run" && arg !== "--yes",
  );
  if (unknownFlags.length > 0) {
    process.stderr.write(`Unknown option: ${unknownFlags[0]}\n`);
    return 1;
  }

  switch (command) {
    case "register":
      return runRegister({ dryRun, yes });
    case "status":
      return runStatus();
    case "unregister":
      return runUnregister();
    default:
      process.stderr.write(`Unknown command: ${command}\n`);
      printUsage();
      return 1;
  }
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === entry) {
  const code = await runCli(process.argv.slice(2));
  process.exit(code);
}
