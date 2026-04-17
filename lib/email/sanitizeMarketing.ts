/**
 * Tiny markdown → sanitized HTML converter for marketing broadcasts.
 *
 * Allowed tags: p, strong, em, br, a (http/https/mailto only), h1, h2, h3, ul, ol, li.
 * Markdown supported: **bold**, *italic*, [text](url), # / ## / ### headings,
 * - list items, and paragraph-separated blocks.
 *
 * This is *NOT* a general-purpose sanitizer — don't pass untrusted HTML from
 * public users. Admins only.
 */
export function sanitizeMarketingHtml(input: string): string {
  // 1) Strip all raw HTML tags except the minimal allow-list.
  const noTags = input.replace(/<[^>]*>/g, (m) => {
    const allowed = /^<\/?(strong|em|br|p|h1|h2|h3|ul|ol|li|a)(\s[^>]*)?>$/i;
    return allowed.test(m) ? m : "";
  });

  let html = noTags;

  // 2) Links: [text](http(s)://... or mailto:...)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text: string, url: string) => {
      const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeUrl = url.replace(/"/g, "");
      return `<a href="${safeUrl}" style="color:#3A4A2F;text-decoration:underline">${safeText}</a>`;
    },
  );

  // 3) Bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  // 4) Heading prefixes (line-by-line).
  html = html
    .split(/\n/)
    .map((line) => {
      if (/^###\s+/.test(line)) return `<h3>${line.replace(/^###\s+/, "")}</h3>`;
      if (/^##\s+/.test(line)) return `<h2>${line.replace(/^##\s+/, "")}</h2>`;
      if (/^#\s+/.test(line)) return `<h1>${line.replace(/^#\s+/, "")}</h1>`;
      return line;
    })
    .join("\n");

  // 5) Unordered list groups
  html = html.replace(
    /(^|\n)((?:-\s+[^\n]+\n?)+)/g,
    (_m, lead: string, block: string) => {
      const items = block
        .trim()
        .split(/\n/)
        .map((l) => l.replace(/^-\s+/, "").trim())
        .filter(Boolean)
        .map((l) => `<li>${l}</li>`)
        .join("");
      return `${lead}<ul>${items}</ul>`;
    },
  );

  // 6) Paragraph-ize remaining blank-line-separated blocks.
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-3]|ul|ol|p)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
}
