import { zite } from 'zitejs/db';

const STOP = new Set((
  'the and for are but not you your with this that have has had was were been from they them their its it\'s ' +
  'about into than then too very just out our can could would should will all any when what which who how why ' +
  'get got one more also still even much really like only some there here after before again been being does did'
).split(/\s+/));

export function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Groups near-identical feedback so one complaint raised many times isn't counted as many separate problems.
 * Two items are duplicates when they sit in the same category and either their text overlaps strongly,
 * or they describe the same complaint with moderately similar text.
 */
export async function detectDuplicates(): Promise<{ clusters: number; duplicates: number; total: number }> {
  const { records } = await zite.feedback.findAll({ limit: 2000 });
  const items = records
    .filter((r) => (r.content ?? '').trim())
    .map((r) => ({
      id: r.id,
      category: (r.category ?? '').trim().toLowerCase(),
      time: r.submittedAt ? new Date(r.submittedAt).getTime() : 0,
      text: tokens(r.content ?? ''),
      complaint: tokens(r.complaint ?? ''),
      current: r.duplicateOf ?? '',
    }));

  const parent = new Map<string, string>(items.map((i) => [i.id, i.id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) { const n = parent.get(x)!; parent.set(x, root); x = n; }
    return root;
  };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };

  const byCat = new Map<string, typeof items>();
  for (const i of items) {
    const list = byCat.get(i.category) ?? [];
    list.push(i);
    byCat.set(i.category, list);
  }
  for (const list of byCat.values()) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const A = list[a], B = list[b];
        const text = jaccard(A.text, B.text);
        const same = A.complaint.size > 1 && jaccard(A.complaint, B.complaint) >= 0.8;
        if (text >= 0.6 || (same && text >= 0.3)) union(A.id, B.id);
      }
    }
  }

  // canonical = earliest submission in each cluster
  const groups = new Map<string, typeof items>();
  for (const i of items) {
    const r = find(i.id);
    const g = groups.get(r) ?? [];
    g.push(i);
    groups.set(r, g);
  }
  const target = new Map<string, string>();
  let clusters = 0, duplicates = 0;
  for (const g of groups.values()) {
    const canon = [...g].sort((x, y) => x.time - y.time || x.id.localeCompare(y.id))[0];
    if (g.length > 1) { clusters++; duplicates += g.length - 1; }
    for (const i of g) target.set(i.id, i.id === canon.id ? '' : canon.id);
  }

  const changed = items.filter((i) => (target.get(i.id) ?? '') !== i.current);
  for (let i = 0; i < changed.length; i += 25) {
    await Promise.all(changed.slice(i, i + 25).map((c) => zite.feedback.update({ id: c.id, record: { duplicateOf: target.get(c.id) ?? '' } })));
  }
  return { clusters, duplicates, total: items.length };
}
