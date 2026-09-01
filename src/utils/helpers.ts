/**
 * Removes HTML tags from a string and unescapes HTML entities.
 * Useful for previewing rich text content or cleaning data before display.
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';

  // 1. Replace common block/line-break tags with newlines to preserve basic structure
  let content = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  // 2. Remove all remaining HTML tags
  const tmp = document.createElement('DIV');
  tmp.innerHTML = content;

  // 3. textContent handles unescaping entities like &nbsp; or &amp;
  let cleanText = tmp.textContent || tmp.innerText || '';

  // 4. Replace non-breaking spaces and multiple spaces with a single space
  cleanText = cleanText.replace(/\u00a0/g, ' ');
  cleanText = cleanText.replace(/\s\s+/g, ' ');

  return cleanText.trim();
};
