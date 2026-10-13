export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const pick = (h: string[], names: string[]) => h.findIndex((x) => names.includes(x.trim().toLowerCase()));

export function csvToFeedback(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const ci = pick(header, ['content', 'feedback', 'text', 'review', 'comment', 'message', 'body']);
  const si = pick(header, ['source', 'channel', 'type']);
  const ni = pick(header, ['customer', 'customer name', 'customername', 'name', 'author', 'user']);
  const ri = pick(header, ['rating', 'score', 'stars']);
  const di = pick(header, ['date', 'submitted at', 'submittedat', 'created', 'created at', 'timestamp']);
  const content = ci >= 0 ? ci : 0;
  return rows.map((r) => ({
    content: r[content] ?? '',
    source: si >= 0 ? r[si] : undefined,
    customerName: ni >= 0 ? r[ni] : undefined,
    rating: ri >= 0 && r[ri] && !isNaN(Number(r[ri])) ? Number(r[ri]) : undefined,
    submittedAt: di >= 0 ? r[di] : undefined,
  })).filter((r) => r.content.trim());
}
