export class InspectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectError";
  }
}

export function isInspectError(error: unknown): error is InspectError {
  return error instanceof InspectError;
}
