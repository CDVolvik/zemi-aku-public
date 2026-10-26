// The opening plan: one town's siting verdict for one industry, as a page an owner can print and take on a
// visit (app/plan.html writes the words). It is the same rule-based verdict the map gives, with no model turn,
// plus the nearest other gap-group town to compare against.
import { INDUSTRIES } from './opportunity.mjs';
import { distanceKm } from './coastal.mjs';
import { fold } from './lib.mjs';

// The town the verdict note compares with (withVerdictNote in scripts/serve-eagle.mjs, same rule): for a gap town,
// the next gap-group town by taste rank, else the top one; never the town itself. The straight-line distance
// between town centers rides along so an owner sees whether it is a drive away.
export function comparisonTown(file, town, centers) {
  if (!Array.isArray(file?.towns)) return null;
  const own = file.towns.find((row) => fold(row.town) === fold(town));
  if (!own) return null;
  const gapRows = file.towns.filter((r) => r.group === 'gap' && r.town !== own.town).sort((a, b) => (a.tasteRank ?? 99) - (b.tasteRank ?? 99));
  const after = own.group === 'gap' ? gapRows.find((r) => (r.tasteRank ?? 99) > (own.tasteRank ?? -1)) : null;
  const row = after || gapRows[0];
  if (!row) return null;
  const home = centers.get(fold(own.town)), there = centers.get(fold(row.town));
  const ranked = file.towns.filter((r) => Number.isInteger(r.tasteRank)).length;
  return { town: row.town, basis: after ? 'next' : 'top', group: row.group, tasteRank: row.tasteRank, ranked,
    distanceKm: home && there ? Number(distanceKm(home, there).toFixed(1)) : null,
    establishments: row.establishments, establishmentsMax: row.establishmentsMax, employees: row.employees, suppressed: row.suppressed,
    perTenThousand: row.perTenThousand, perTenThousandMax: row.perTenThousandMax };
}

export function createPlan({ businessAnswer, opportunity, centers, knownTown, now = () => new Date() }) {
  return async ({ industry, town, lang }) => {
    const kind = INDUSTRIES.find((row) => row.id === industry);
    const name = knownTown(town || '');
    if (!kind || !name) return { status: 400, body: { error: 'An industry and a Puerto Rico municipality are required' } };
    const file = opportunity.get(industry);
    if (!file) return { status: 503, body: { error: 'Opportunity data is not built yet' } };
    const es = lang === 'es';
    // The map's own town question, so the plan and the map's verdict read the same rows.
    const answer = await businessAnswer({ question: `Should I open a ${kind.label.en} in ${name}?`, town: name, lang: es ? 'es' : 'en' }, { force: true });
    if (!answer?.business?.evidence?.opportunity) return { status: 503, body: { error: 'No verdict for this town' } };
    // A missing or unreadable catalog would print as "Qloo lists 0 places" (Codex review 10/26): no plan instead.
    if (!answer.business.available) return { status: 503, body: { error: 'The town catalog is unavailable' } };
    return { status: 200, body: { industry, label: kind.label, town: name, lang: es ? 'es' : 'en', at: now().toISOString(),
      speech: answer.speech || '', places: answer.places || [], business: answer.business, compare: comparisonTown(file, name, centers) } };
  };
}
