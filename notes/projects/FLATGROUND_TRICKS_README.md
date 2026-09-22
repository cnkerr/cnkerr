# A Compendium of Flatground Tricks — maintenance notes

This project is intentionally a static, framework-free page. The public interface is `notes/projects/flatground-tricks.html`; the editable data source is `notes/projects/flatground-tricks-source.csv`.

## Data flow

Do not edit `flatground-tricks-data.js` or `flatground-tricks-data.csv` directly. They are generated files.

1. Edit or import the canonical source CSV.
2. Run `node scripts/update-flatground-data.mjs --write`.
3. Run `node scripts/validate-flatground-tricks.mjs`.
4. Open the page locally and run the browser QA suite before merging.

The generator also updates static trick-count text in the HTML.

## Adding Part IX or Part X

Generate a 100-row spreadsheet template:

```bash
node scripts/update-flatground-data.mjs --template 9
```

or:

```bash
node scripts/update-flatground-data.mjs --template 10
```

Fill every row in the generated CSV. Required columns are:

`trick_number, trick_name, stance, part, caption_seconds, family, subfamily, modifiers, sibling_key, youtube_url`

Use `|` between multiple modifiers, for example `Frontside|360`.

Before writing anything, dry-run the batch:

```bash
node scripts/update-flatground-data.mjs --batch flatground-part-9-template.csv
```

If the dry run passes:

```bash
node scripts/update-flatground-data.mjs --batch flatground-part-9-template.csv --write
node scripts/validate-flatground-tricks.mjs
```

A release batch must contain exactly 100 sequential tricks and must be the next part. The project accepts 800, 900, or 1,000 total tricks.

## Timestamp rule

`caption_seconds` is the audited moment the on-screen trick caption appears. Playback begins one second before that onset. It ends one second after the next trick's caption onset. The last trick in each 100-trick part runs to the end of the installment.

Timestamps must increase within each part.

## Stances

Order everywhere:

1. Regular
2. Switch
3. Nollie
4. Fakie

Colors:

- Regular — `#00A84F`
- Switch — `#D600A9`
- Nollie — `#E22020`
- Fakie — `#00CFE8`

## Sibling grouping rules

Sibling grouping is deliberately stricter than search.

- Word order matters. Do not merge groups merely because the same words appear in a different order.
- A body varial with no named direction is treated as frontside for sibling grouping.
- A bigspin with no named direction is treated as backside for sibling grouping.
- A sibling group must never contain two tricks from the same stance unless there is an explicit, documented exception.
- Search aliases must stay separate from sibling aliases; permissive search must not change taxonomy.

Known intentional separations include the double-heel/body-varial and cancel-heel/body-varial groups where merging would create same-stance collisions.

## Filters and related tricks

Stance filters are multi-select. Filter categories use AND logic across active filters.

The primary type order is:

- Ollies / Spins
- Shuv-its
- Kickflips
- Heelflips
- Impossible
- Caspers
- Forward Flips
- Cancel Flips
- Semi Flip
- Kickback

Related-trick ranking is independent from search aliases and sibling aliases. Do not change it merely to make search results broader.

## QA

`.github/workflows/validate-flatground.yml` checks data integrity and generated-file consistency.

`.github/workflows/flatground-ui-qa.yml` exercises the interface in Chromium, Firefox, and WebKit, including 320px, 375px, and 390px mobile widths.

Before a release, confirm:

- no horizontal overflow;
- all five stance filters remain on one mobile line;
- search/filter counts update correctly;
- Back/Forward works inside trick navigation;
- the overview has one Tab stop and arrow-key navigation;
- the info dialog and trick dialog remain usable at narrow widths;
- the raw-data download returns the same record count as the canonical source.

## Files that should not be hand-edited

- `notes/projects/flatground-tricks-data.js`
- `notes/projects/flatground-tricks-data.csv`

If either differs from the canonical source, CI should fail and instruct you to regenerate it.
