import { RegistryClient } from "./client.js";
import { loadMapConfig, removeMapConfigSiteId } from "./config.js";
import { clearLocalState, readLocalState, resolveSiteId, resolveSiteToken } from "./local-state.js";
import { findProjectRoot } from "./packages.js";
import { sanitizeTerminalText } from "./sanitize.js";

export interface UnregisterOptions {
  cwd?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  envToken?: string;
  log?: (message: string) => void;
}

function defaultLog(message: string): void {
  process.stdout.write(`${message}\n`);
}

export async function runUnregister(options: UnregisterOptions = {}): Promise<number> {
  const log = options.log ?? defaultLog;
  const cwd = options.cwd ?? process.cwd();
  const projectRoot = await findProjectRoot(cwd);
  const config = await loadMapConfig(projectRoot);
  const localState = await readLocalState(projectRoot);
  const siteId = resolveSiteId(config.siteId, localState);
  const envToken = options.envToken ?? process.env.ENGAWA_MAP_TOKEN;
  const token = resolveSiteToken(envToken, localState);

  if (!siteId) {
    log("No siteId found. Nothing to unregister.");
    return 1;
  }

  if (!token) {
    log("No site token found. Set ENGAWA_MAP_TOKEN or create .engawa-map.local.json.");
    return 1;
  }

  const client = new RegistryClient({
    endpoint: options.endpoint,
    fetchImpl: options.fetchImpl,
  });

  try {
    await client.unregister(siteId, token);

    await clearLocalState(projectRoot);
    await removeMapConfigSiteId(projectRoot);

    log(`Site ${siteId} delisted.`);
    if (envToken) {
      log("ENGAWA_MAP_TOKEN was used for authentication; clear it manually from your environment.");
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Unregister failed: ${sanitizeTerminalText(message)}`);
    return 1;
  }
}
