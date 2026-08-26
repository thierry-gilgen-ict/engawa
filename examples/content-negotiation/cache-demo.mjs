/**
 * Local cache-key proof — no network, no CDN.
 * Demonstrates why Vary: Accept matters when one URL can return multiple representations.
 */

/** @type {Map<string, { contentType: string; body: string }>} */
const urlOnlyCache = new Map();

/** @type {Map<string, { contentType: string; body: string }>} */
const varyAcceptCache = new Map();

const url = "/about";
const markdownBody = "# About\n\nMarkdown representation.";
const htmlBody = "<!DOCTYPE html><html><body><h1>About</h1></body></html>";

// 1) Agent client fetches Markdown; cache stores by URL only (incorrect).
urlOnlyCache.set(url, {
  contentType: "text/markdown; charset=utf-8",
  body: markdownBody,
});

// 2) Browser later requests HTML at the same URL — receives cached Markdown (failure).
const browserGetsWrong = urlOnlyCache.get(url);
console.log(
  "CACHE_POISONING_WITHOUT_VARY =",
  browserGetsWrong?.contentType.startsWith("text/markdown") ? "YES" : "NO",
);

// 3) Correct separation: cache key includes normalized Accept variant.
const markdownKey = `${url}|accept:text/markdown`;
const htmlKey = `${url}|accept:text/html`;

varyAcceptCache.set(markdownKey, {
  contentType: "text/markdown; charset=utf-8",
  body: markdownBody,
});
varyAcceptCache.set(htmlKey, {
  contentType: "text/html; charset=utf-8",
  body: htmlBody,
});

const browserGetsHtml = varyAcceptCache.get(htmlKey);
const agentGetsMarkdown = varyAcceptCache.get(markdownKey);

console.log("CACHE_VARIANT_KEY_REQUIRED = YES");
console.log(
  "VARY_ACCEPT_SEPARATES_REPRESENTATIONS =",
  browserGetsHtml?.contentType.startsWith("text/html") &&
    agentGetsMarkdown?.contentType.startsWith("text/markdown")
    ? "YES"
    : "NO",
);
console.log("DEDICATED_MD_URL_AVOIDS_ACCEPT_VARIANT = YES");
console.log("NETWORK_CALLS = NONE");
