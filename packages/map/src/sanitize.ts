const MAX_SANITIZED_LENGTH = 500;

export function sanitizeTerminalText(input: string, maxLength = MAX_SANITIZED_LENGTH): string {
  let result = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) {
      continue;
    }
    result += char;
    if (result.length >= maxLength) {
      break;
    }
  }
  return result;
}
