# Does the gap signal point at towns that later gained businesses? A Census backtest

## Preregistration (written and committed before any 2019 data was fetched)

**Question.** The opportunity map calls a town a *gap* for an industry when Qloo's taste for that kind of place is
at or above the island median and the town has few businesses per 10,000 residents. If that signal means anything
on the ground, gap towns should have gained more establishments in that industry over the following years than
towns with equally few businesses but weaker taste.

**Data.**
- Businesses: U.S. Census Bureau County Business Patterns (CBP), 2019 and 2023, Puerto Rico municipios, the same
  NAICS 2017 codes the app uses (café 722515, bakery 311811, restaurant 722511 + 722513, bar 722410, hotel 721110,
  beauty salon 812112).
- Taste: the app's saved Qloo heatmap affinity per town (retrieved 2026-10-11), unchanged.
- Residents: the app's Puerto Rico Community Survey 2020–2024 estimate, the same denominator for both years.

**Groups.** Recomputed with the app's own rule (`groupTowns` in `server/opportunity.mjs`) from 2019 counts and the
saved taste: gap, competitive, quiet, crowded or unknown.

**Outcome.** Change in establishments per 10,000 residents from 2019 to 2023, per town and industry. A town is left
out of the outcome for an industry when any of its codes is unpublished (fewer than 3) in either year.

**Primary test.** Gap against quiet, pooled over the six industries: the difference in mean outcome, with a one-sided
permutation p-value (labels shuffled within each industry, 10,000 draws, fixed seed). Both groups start with few
businesses, so mean reversion alone does not separate them; taste is the only thing the rule uses to split them.

**Secondary.** The same difference per industry; gap against all other known towns; the share of gap and quiet towns
that gained at least one establishment.

**Reported whatever the result.** A null or negative result goes on the same page and in the submission.

**Known weakness, stated in advance.** Qloo's taste was measured in 2026, after the outcome window. If taste partly
reflects businesses that opened between 2019 and 2023, the test is optimistic. CBP excludes the self-employed and
counts establishments with paid employees only. Small groups make wide intervals.

## Result (run 2026-10-26, `node scripts/backtest-gap.mjs`, output `data/backtest-gap.json`)

**Suggestive, not proven.** Within each industry, towns the rule would have called a gap in 2019 gained more
establishments by 2023 than the quiet towns (equally few businesses, weaker taste) in **5 of 6 industries**. The
preregistered permutation test puts that at **p = 0.07, one-sided**: short of the usual 0.05.

| Industry | Gap towns | Quiet towns | Gap: change per 10,000 | Quiet: change per 10,000 | Difference |
|---|---:|---:|---:|---:|---:|
| Café | 10 | 6 | +0.90 | +0.41 | **+0.49** |
| Bakery | 12 | 6 | +0.02 | +0.20 | **−0.17** |
| Restaurant | 10 | 22 | +2.27 | +1.80 | **+0.48** |
| Bar | 8 | 2 | +0.50 | +0.13 | **+0.37** |
| Hotel | 7 | 2 | +0.04 | 0.00 | **+0.04** |
| Beauty salon | 6 | 3 | +0.32 | +0.18 | **+0.14** |

**The preregistered pooled difference points the other way, and why.** Pooled over industries, gap towns averaged
+0.72 and quiet towns +1.07 per 10,000 residents (difference −0.35; 68% against 78% gained at least one establishment).
That is a mix effect, not a reversal: 22 of the 41 quiet rows are restaurants, the industry that grew fastest, against
10 of 53 gap rows. The permutation test shuffles labels within each industry, so it holds that mix fixed, and on that
footing the observed result sits above 92.6% of the shuffles (p = 0.0735). Not preregistered, and labelled exploratory:
the average of the six per-industry differences is +0.23 per 10,000.

**Bakeries, the industry on the app's first screen, are the one loss.** Gap towns gained 0.02 bakeries per 10,000
residents against 0.20 for quiet towns. The app's bakery map should not be read as a forecast.

**Coverage.** 195 of 468 town-industry rows have published counts in both years; 273 are left out because Census
suppresses counts below 3 (bars, hotels and salons in small towns most of all). Per industry: café 32, bakery 41,
restaurant 65, bar 19, hotel 20, salon 18 of 78. Groups this small make every per-industry number fragile.

**What this does and does not show.** It checks the signal against Census establishment counts by municipio, the
public series the map already uses. It does not show that a business opened in a gap town will succeed: CBP counts
establishments with employees, not openings, survival or revenue. And taste was measured in 2026, after the window,
which most likely flatters the result (see the weakness stated above).