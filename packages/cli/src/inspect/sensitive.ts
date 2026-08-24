const SENSITIVE_SEGMENTS = [
  "admin",
  "login",
  "auth",
  "account",
  "dashboard",
  "settings",
  "checkout",
  "cart",
  "api",
  "preview",
  "draft",
  "private",
  "user",
  "wp-admin",
  "wp-login",
];

export interface SensitiveCheck {
  sensitivePathHint: boolean;
  reason?: string;
}

export function checkSensitivePath(pathname: string): SensitiveCheck {
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  for (const segment of segments) {
    for (const hint of SENSITIVE_SEGMENTS) {
      if (segment === hint || segment.startsWith(`${hint}-`) || segment.endsWith(`-${hint}`)) {
        return { sensitivePathHint: true, reason: "sensitive-path-heuristic" };
      }
    }
  }
  return { sensitivePathHint: false };
}
