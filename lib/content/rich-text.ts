import sanitizeHtml from "sanitize-html";

export function cleanRichText(value: string) {
  if (!/<\/?[a-z][^>]*>/i.test(value)) return value;
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h2", "h3", "blockquote", "a"],
    allowedAttributes: { a: ["href", "title"], p: ["style"], h2: ["style"], h3: ["style"] },
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"], allowProtocolRelative: false,
  });
}
export function richTextHtml(value: string) {
  if (/<\/?[a-z][^>]*>/i.test(value)) return cleanRichText(value);
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>");
}
