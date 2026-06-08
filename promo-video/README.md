# River Bankers — Promo Video Workspace

First-draft toolchain for producing a ~2-minute promo video. The 27-second
"Headwaters auction" scene rendered here is a **proof of concept** to validate
the tool stack before scaling to the full 2-minute cut.

## What's here

```
promo-video/
├── script.md                # 25s scene + outline for the full 2-min video
├── scene1.txt               # Narration for the proof-of-concept scene
├── scene1_andrew.mp3        # Andrew (warm/confident male) voiceover, free
├── scene1_andrew.vtt        # Word-segment subtitle timing
├── scene1_ava.mp3           # Ava (expressive/caring female) voiceover, free
├── scene1_ava.vtt
├── src/
│   ├── index.ts             # Remotion entry
│   ├── Root.tsx             # Registers Scene1 + Scene1Ava compositions
│   └── scenes/Scene1.tsx    # Headwaters-auction scene, ~27s, 1920x1080@30
├── public/                  # Assets visible to Remotion at runtime
│   ├── material-deck/       # → ../../material-deck (real card art)
│   ├── structure-deck/      # → ../../structure-deck
│   ├── artwork/             # → ../../artwork (logo, background)
│   ├── icons/               # → ../../graphics/icons
│   ├── board/               # river-board.png + fish-board.png (copies)
│   ├── worker-{species}.png # Worker chit icons (copies)
│   └── voiceover/           # Generated MP3s
├── out/                     # Rendered MP4s + extracted preview frames
└── package.json
```

(Symlinks point into the repo so updates to card art flow through automatically.
The board PNGs and worker chits are copied because Remotion's bundler doesn't
follow symlinks that escape `public/`.)

## How to iterate

```sh
# Live preview (Remotion Studio) at http://localhost:3000
npm run dev

# Edit narration:
$EDITOR scene1.txt

# Regenerate voiceover (free, instant):
~/.local/bin/edge-tts \
  --voice en-US-AndrewMultilingualNeural \
  --rate=-5% \
  --file scene1.txt \
  --write-media scene1_andrew.mp3 \
  --write-subtitles scene1_andrew.vtt
cp scene1_andrew.mp3 public/voiceover/

# Adjust timing markers in src/scenes/Scene1.tsx (`const T = {...}`)
# to match new VTT cue times.

# Render final MP4:
npm run build       # → out/scene1.mp4
```

## Tool choices and tradeoffs

### Animation: **Remotion**

[`remotion.dev`](https://www.remotion.dev/) — TypeScript/React framework that
renders video programmatically. Free for individuals and companies up to three
people. Commercial use allowed under the personal license.

**Why it fits:**

- Animations are React components; timing comes from `useCurrentFrame()`.
- Built-in `<Audio>` primitive does VO mixing for us — no separate audio editor.
- The existing card PNGs drop in via `staticFile()` with no asset pipeline.
- Hot-reload preview means script-and-animation iteration is sub-second.
- Output is a real MP4 (1920x1080, H.264 + AAC) — YouTube-ready.

**Tradeoffs:**

- React boilerplate, ~180 dependencies in `node_modules` (~280 MB).
- The composition is code, not a timeline GUI — graphic-designer collaboration
  is harder without a side-by-side preview tool.
- Renders are CPU-bound. The 27-second scene took ~25–30 s on this machine.
  A 2-minute video should take ~2–3 min per render.

**Alternatives we did not build:**

- **DaVinci Resolve** (free, GUI timeline) — better if you want to hand-edit
  the timeline visually, but doesn't accept React components, so any change to
  a card layout would mean re-exporting and re-importing assets.
- **Manim** (free, Python) — great for math/diagram animations, awkward for
  asset-heavy card layouts.
- **Motion Canvas** (free, TypeScript) — keyframe-oriented; less natural for
  importing dozens of game PNGs.

### Voice: **Edge-TTS** for drafting, **ElevenLabs Starter** for final

#### Edge-TTS — current pick for iteration

Microsoft Edge's neural-voice service exposed through the open-source
[`edge-tts`](https://github.com/rany2/edge-tts) Python package.

- **Cost: $0.** Unlimited use, no API key.
- **Quality: surprisingly good.** Two voices are included here for comparison:
  - `en-US-AndrewMultilingualNeural` — warm, confident, conversational
  - `en-US-AvaMultilingualNeural` — expressive, friendly, lighter
- Word-segment subtitles written to a VTT file, which we used to set the
  Scene1.tsx timing markers — every animation cue is locked to a real
  word boundary in the actual audio.

**Caveats:**

- Microsoft's TOS is ambiguous about heavy commercial use of Edge-TTS output;
  for a one-off YouTube upload of a personal hobby video it's fine, but if
  this becomes ad-funded, switch to a service that licenses commercial use
  explicitly.
- No emotion control, no voice cloning, no SSML extras like emphasis on
  specific words.

#### ElevenLabs Starter — recommended for the final cut

- **Cost: $5/month** for 30,000 characters (about 30 minutes of audio,
  enough to re-render a 2-minute script ~15 times).
- Commercial-use rights included on Starter and above.
- Cleanest voice quality of the tested options; emotional range is much
  richer than Edge-TTS.
- Stripe checkout, monthly cancel — no annual commitment.

#### Why not OpenAI TTS

OpenAI's `tts-1-hd` at $30/M chars would cost about $0.01 per 2-minute render,
i.e. essentially free per iteration. The quality is comparable to ElevenLabs
Starter. The reason it's not the default: the Anthropic API/SDK in this repo
doesn't have an OpenAI key configured, so we'd need to add one. If we end up
doing many ad-hoc re-renders, switching to OpenAI TTS is the lower-friction
move; otherwise ElevenLabs is a one-click checkout.

### Publishing: YouTube manual upload

The output MP4 satisfies YouTube's requirements (H.264 + AAC, 1080p). No
automation needed for a single video — just drag-drop in the YouTube Studio.
If we end up publishing many cuts, the `youtube-data` API can automate it, but
that's overhead we don't need yet.

## Budget summary

| Item                              | Cost                  |
|-----------------------------------|-----------------------|
| Remotion personal license         | $0                    |
| Edge-TTS for first drafts         | $0                    |
| ElevenLabs Starter (final render) | $5/mo, cancel anytime |
| YouTube hosting                   | $0                    |
| **Total worst case (1 month)**    | **$5**                |

Well under the stated $50 budget; the rest of the budget is available if we
want to upgrade to ElevenLabs Creator ($22/mo) for higher-quality voice
cloning or to license a music bed.

## Open questions for the user

1. **Voice preference.** Both `out/scene1_andrew.mp4` and `out/scene1_ava.mp4`
   exist — please listen to both and tell me which voice feels more
   "River Bankers."
2. **Script tone.** The current narration leans informative ("On your turn,
   you reach upstream — pay two fish to pull a card down"). Should the full
   2-minute video lean **explainer** (rules walkthrough) or **vibe**
   (atmospheric, less mechanical detail)?
3. **Music bed.** Royalty-free river/forest ambient bed under the VO? If yes,
   I'll grab one from Pixabay or Free Music Archive for the next render.
4. **Logo + tagline.** Closing reads "Build the bank before your rivals do."
   Does that land, or do you want a different tagline?

Once the voice and tone are picked, I can expand from the 27-second scene to
the full 2-minute outline in `script.md`.
