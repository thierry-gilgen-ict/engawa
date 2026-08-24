const MAX_SANITIZED_LENGTH = 500;

function isUnsafeChar(code: number): boolean {
  if (code < 32 || code === 127) {
    return true;
  }
  if (code >= 0x007f && code <= 0x009f) {
    return true;
  }
  if (code >= 0x202a && code <= 0x202e) {
    return true;
  }
  if (code >= 0x2066 && code <= 0x2069) {
    return true;
  }
  return false;
}

export function sanitizeTerminalText(input: string, maxLength = MAX_SANITIZED_LENGTH): string {
  let result = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (isUnsafeChar(code)) {
      continue;
    }
    result += char;
    if (result.length >= maxLength) {
      break;
    }
  }
  return result;
}
