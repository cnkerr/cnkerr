# A Compendium of Flatground Tricks — maintenance guide

This document is the operational reference for the Flatground Tricks project.

## Production files

- `flatground-tricks.html` — application UI and interaction logic.
- `flatground-tricks-source.json` — **canonical trick dataset. Edit this source, not the generated files.**
- `flatground-tricks-data.js` — generated browser data consumed by the application.
- `flatground-tricks-data.csv` — generated public raw-data download.
- `../../scripts/flatground-sync.mjs` — regenerates browser data, CSV, and count-dependent HTML from the canonical source.
- `../../scripts/validate-flatground-tricks.mjs` — validates data integrity and sibling rules.
- `../../tests/flatground-ui.spec.js` — browser-level UI regression suite.

## Adding Part IX or Part X

Prepare one JSON file containing exactly 100 new records. Every record has this shape:

```json
{
  "num": 801,
  "name": "example trick",
  "family": "Kickflips",
  "subfamily": "Kickflip",
  "modifiers": ["Frontside"],
  "stance": "Regular",
  "siblingKey": "frontside flip",
  "part": 9,
  "seconds": 12.4,
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Then run:

```bash
node scripts/flatground-sync.mjs --append path/to/part-9.json
```

That single command:

1. appends the batch to `flatground-tricks-source.json`;
2. regenerates `flatground-tricks-data.js`;
3. regenerates `flatground-tricks-data.csv`;
4. updates count-dependent metadata and initial UI counts in `flatground-tricks.html`;
5. runs the complete validator.

For an ordinary edit to an existing record, edit only `flatground-tricks-source.json`, then run:

```bash
node scripts/flatground-sync.mjs
```

Before committing, verify that generated files are current with:

```bash
node scripts/flatground-sync.mjs --check
```

CI runs the same check automatically.

## Timing rules

- `seconds` is the audited moment the trick caption appears.
- Playback starts one second before the caption onset.
- Playback ends one second after the following caption onset.
- The final trick in each installment runs to the end of that installment.
- Caption onsets must increase strictly within each part.
- Do not infer or round timestamps from the older pre-audit values.

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

## Sibling rules

Sibling matching is stricter than search.

- Word order matters. Do not collapse differently ordered trick names merely because they sound equivalent.
- An unnamed body varial is treated as frontside.
- An unnamed bigspin is treated as backside.
- A sibling group may not contain two tricks from the same stance unless an explicit project-specific exception is deliberately added.
- `SIBLING_KEY_ALIASES` in `flatground-tricks.html` is the controlled normalization layer.
- Search aliases are intentionally separate from sibling aliases. Search may be permissive; sibling grouping may not.

Known intentional separations include the double-heelflip/body-varial and cancel-heel/body-varial groups where merging would create same-stance collisions.

## Taxonomy

The source fields `family`, `subfamily`, and `modifiers` drive filtering and related-trick ranking. Do not change taxonomy labels casually: the validator maintains an allow-list and will reject unknown labels.

Current modifier grouping in the UI:

- Direction / Rotation
- Multiples
- Techniques

Families are presented through the curated filter tree rather than exposed as a raw technical taxonomy.

## QA

Pull requests that touch the project run:

- data/source synchronization validation;
- syntax validation;
- sibling collision validation;
- local browser smoke tests;
- Chromium, Firefox, and WebKit UI regression tests;
- mobile tests at 320, 375, and 390 px widths;
- deployed-site checks in Chromium and WebKit.

The browser suite covers filtering, search aliases, URL state, Back/Forward navigation, modal behavior, raw-data links, mobile one-line stance controls, mobile quick tools, horizontal overflow, and keyboard navigation of the stance grid.

## Design constraints

- Preserve the existing title/header typography unless a deliberate redesign is requested.
- The stance overview is functional data visualization, not decoration. Never recolor or rearrange its cells for visual effect.
- Keep the interface light and database-like; avoid adding cards, thumbnails, animation, or framework complexity without a demonstrated usability benefit.
- The project remains intentionally framework-free.


## Social preview

The share card source is `flatground-tricks-share.html`. The committed `flatground-tricks-social.png` is generated from it at 1200 × 630.

When the share-card source or generated browser data changes on `main`, GitHub Actions re-renders the PNG and commits the updated asset automatically. The production page references that PNG through Open Graph and Twitter metadata.

Do not hand-edit the PNG.
