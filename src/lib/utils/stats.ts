import { MATCH_TO_WEIGHT_KEY, STAT_CATEGORIES, KEEPER_ALWAYS_SHOW } from "$lib/data/matchStatWeighing";

export function rankMatchStats(row, detailedPosition, limit = 5) {
  const isKeeper = detailedPosition === 'Goalkeeper';
  const ranked = [];

  for (const [col, weightKey] of Object.entries(MATCH_TO_WEIGHT_KEY)) {
    const val = row[col];
    if (val == null) continue;
    const cats = STAT_CATEGORIES[weightKey] ?? [];
    let importance = 0;
    for (const cat of cats) {
      const imp = IMP_MAPS[cat][detailedPosition]?.[weightKey];
      if (imp != null) importance = Math.max(importance, Math.abs(imp)); // max across categories
    }
    ranked.push({ col, weightKey, value: val, importance });
  }

  ranked.sort((a, b) => b.importance - a.importance);

  if (isKeeper) {
    const always = KEEPER_ALWAYS_SHOW
      .filter(c => row[c] != null)
      .map(c => ({ col: c, value: row[c], importance: Infinity, alwaysShown: true }));
    const rest = ranked.filter(r => !KEEPER_ALWAYS_SHOW.includes(r.col));
    return [...always, ...rest].slice(0, limit + always.length); // always-shown don't eat ranked slots
  }
  return ranked.slice(0, limit);
}