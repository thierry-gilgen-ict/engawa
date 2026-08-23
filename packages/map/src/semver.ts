import { z } from "zod";

export class SemverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemverError";
  }
}

export const exactSemverSchema = z.string().superRefine((version, ctx) => {
  try {
    validateExactSemver(version);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "invalid exact semver",
    });
  }
});

const DISALLOWED_PREFIXES = /^(?:\^|~|>=|<=|>|<|workspace:|file:|git\+|latest$)/;

const EXACT_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function validateExactSemver(version: string, context = "version"): string {
  const trimmed = version.trim();
  if (trimmed.length === 0) {
    throw new SemverError(`${context} must be a non-empty exact semver`);
  }
  if (DISALLOWED_PREFIXES.test(trimmed)) {
    throw new SemverError(`${context} must be an exact semver, not a range or alias: ${trimmed}`);
  }
  if (!EXACT_SEMVER.test(trimmed)) {
    throw new SemverError(`${context} is not a valid exact semver: ${trimmed}`);
  }
  return trimmed;
}
