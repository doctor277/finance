type Comparable = { date: string | null; amount: number | null; payee: string | null };

/**
 * Normalizes a payee for comparison: case, accents, punctuation and spacing are
 * ignored, so "AMAZON.CA  Marketplace" and "amazon ca marketplace" match.
 */
export function normalizePayee(payee: string): string {
  return payee
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same date, same amount (to the milliunit) and same normalized payee. */
export function fingerprint(t: Comparable): string | null {
  if (t.date === null || t.amount === null || t.payee === null) return null;
  return `${t.date}|${t.amount}|${normalizePayee(t.payee)}`;
}

/**
 * For each incoming row, the id of an existing transaction it duplicates, or null.
 *
 * Matching is one-to-one: if the account already has one $4.50 coffee on a day
 * and the file has two identical ones, only the first file row is flagged. The
 * second is new money spent, not a duplicate.
 */
export function matchExisting(
  incoming: Comparable[],
  existing: (Comparable & { id: string })[],
): (string | null)[] {
  const pool = new Map<string, string[]>();
  for (const tx of existing) {
    const key = fingerprint(tx);
    if (!key) continue;
    const ids = pool.get(key);
    if (ids) ids.push(tx.id);
    else pool.set(key, [tx.id]);
  }

  return incoming.map((row) => {
    const key = fingerprint(row);
    const ids = key ? pool.get(key) : undefined;
    return ids && ids.length > 0 ? ids.shift()! : null;
  });
}

/** For each row, the index of an earlier identical row in the same file, or null. */
export function findRepeatsInFile(rows: Comparable[]): (number | null)[] {
  const firstSeen = new Map<string, number>();
  return rows.map((row, i) => {
    const key = fingerprint(row);
    if (!key) return null;
    const earlier = firstSeen.get(key);
    if (earlier === undefined) {
      firstSeen.set(key, i);
      return null;
    }
    return earlier;
  });
}
