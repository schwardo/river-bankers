# Flotsam Raft — card mockup (not adopted)

Staging material card designed + simmed 2026-09-19 (see the
"Sim a worker-relocation material card" DONE task in river-bankers.org
for the full design, sim results, and canonical wording). 6 icons,
3P+ tier, credit-variant ferry fee executed as the printed two-step.

- `FlotsamRaft.png` — 300 DPI print render of the mock
- `flotsam.svg` — the lashed-driftwood icon glyph (goes in graphics/icons/)
- `flotsam-generator.patch` — `git apply` from the repo root: adds the
  6-icon [3,3] layout, the 3+ badge mapping for 6 icons, the flotsam
  material entry, and the card entry to the material-deck generator.

To adopt: `git apply graphics/mockups/flotsam-raft/flotsam-generator.patch`,
copy `flotsam.svg` to `graphics/icons/`, regenerate, then wire the card
into web/index.html and BGA (sim.js already has it behind RB_STAGING).
