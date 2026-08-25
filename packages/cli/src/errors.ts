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

export class DoctorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DoctorError";
  }
}

export function isInspectError(error: unknown): error is InspectError {
  return error instanceof InspectError;
}

export function isInitError(error: unknown): error is InitError {
  return error instanceof InitError;
}

export function isDoctorError(error: unknown): error is DoctorError {
  return error instanceof DoctorError;
}

export function isCliError(error: unknown): error is InspectError | InitError | DoctorError {
  return isInspectError(error) || isInitError(error) || isDoctorError(error);
}
