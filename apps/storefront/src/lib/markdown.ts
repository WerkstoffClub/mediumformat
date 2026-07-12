/**
 * Tiny Markdown-to-HTML renderer for storefront post bodies.
 *
 * Supports (enough for the mockup content):
 *   #, ##, ### headings; paragraphs; **bold**, *italic*; `code`;
 *   - unordered lists; 1. ordered lists; > blockquote; --- hr;
 *   [text](url) links; ![alt](url) images; raw URLs.
 *
 * All output is HTML-escaped, then patterns are re-inserted.
 * Not a real Markdown parser — deliberately minimal.
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const inline = (text: string): string => {
  let out = escapeHtml(text);

  // Images ![alt](src)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy" />`,
  );

  // Links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );

  // Bold **text**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Inline code `code`
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  return out;
};

export function renderMarkdown(src: string): string {
  if (!src) return '';

  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  let inBlockquote = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Blank — paragraph / list / quote break
    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeBlockquote();
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      closeBlockquote();
      out.push('<hr />');
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        out.push('<blockquote>');
        inBlockquote = true;
      }
      out.push(`<p>${inline(quote[1])}</p>`);
      continue;
    }
    closeBlockquote();

    // Unordered list item
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list item
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    closeList();

    // Paragraph accumulator
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  closeBlockquote();

  return out.join('\n');
}
