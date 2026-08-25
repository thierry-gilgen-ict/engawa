export class InspectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectError";
  }
}

export class InitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitError";
  }
}

export function isInspectError(error: unknown): error is InspectError {
  return error instanceof InspectError;
}

export function isInitError(error: unknown): error is InitError {
  return error instanceof InitError;
}

export function isCliError(error: unknown): error is InspectError | InitError {
  return isInspectError(error) || isInitError(error);
}
