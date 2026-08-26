/** @typedef {{ title: string; body: string }} PublicPage */

/** Single human-public source — both representations derive from this object. */
export const aboutSource = {
  title: "About Example Studio",
  body: "Example Studio is a fictional creative agency specializing in brand design and digital experiences.\n\nWe believe great work starts with listening.",
};

/** @param {PublicPage} source */
export function buildHtml(source) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${source.title}</title>
</head>
<body>
  <h1>${source.title}</h1>
  <p>${source.body.replace(/\n\n/g, "</p><p>")}</p>
</body>
</html>`;
}

/** @param {PublicPage} source */
export function buildMarkdown(source) {
  return `# ${source.title}\n\n${source.body}`;
}

export const htmlBody = buildHtml(aboutSource);
export const markdownBody = buildMarkdown(aboutSource);
