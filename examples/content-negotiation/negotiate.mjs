import { selectRepresentation } from "./accept-parser.mjs";
import { htmlBody, markdownBody } from "./content.mjs";

/** @typedef {{ status: number; headers: Record<string, string>; body: string }} NegotiatedResponse */

/**
 * @param {string | undefined | null} acceptHeader
 * @returns {NegotiatedResponse}
 */
export function negotiateAbout(acceptHeader) {
  const choice = selectRepresentation(acceptHeader);
  if (choice === "not-acceptable") {
    return {
      status: 406,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        vary: "Accept",
      },
      body: "Not Acceptable",
    };
  }

  if (choice === "markdown") {
    return {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        vary: "Accept",
      },
      body: markdownBody,
    };
  }

  return {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      vary: "Accept",
    },
    body: htmlBody,
  };
}

/** Dedicated Model A route — explicit Markdown URL, no Accept negotiation. */
export function dedicatedMarkdownAbout() {
  return {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
    body: markdownBody,
  };
}
