# Sage Prayer ×100 Simulator — Spec

A mobile-first web app that recreates the **Sword x Staff** Sage "Prayer" (skill gacha) flow shown in `sage_skill_100.MP4`. When you tap the angel statue and then **Pray ×100**, it should look and behave like the video, with a freshly rolled set of 100 skills each time.

Status: **draft, v1 = proof of concept.** Items marked ⚠️ **TBD** are waiting on input (see [Open questions](#10-open-questions)). All classes' skills now come from lootandwaifus.com (§4a).

---

## 1. Scope

**In scope (v1)**
- Home screen with a tappable angel statue
- Prayer screen (Sage, Standard banner)
- **Pray ×100** → Confirm dialog → OK
- Reveal animation: 100 items appear one at a time in an auto-scrolling 3-column grid
- Full skills stay as full skills. Duplicate conversion into shards is deferred (§3.4).
- Back button → Prayer screen with updated counters
- Random rolls using the game's real drop rates (§5) and pity rules (§6)
- **Pray ×1 / ×10 / ×100** on both the Prayer and results screens. Only ×100 shows the Confirm dialog; ×1 and ×10 draw immediately. Each costs 1 gem per pull and uses the same reveal. ×1 and ×10 results are centered vertically, since they fit on one screen. ⚠️ That layout is a guess; the video only shows ×100.

**Out of scope (v1).** These are shown as static images only and do nothing when tapped:
- Premium / Affection banners, Exchange / Goals tabs, "Sage" class dropdown
- The Home screen's other buttons (events, shop, chat, nav bar)
- Gem purchasing. You start with 1000 gems (10 × Pray ×100 = 1000 pulls). Pray ×100 is blocked with a "Not enough gems" message when fewer than 100 remain. Hold the Prayer title to reset.

---

## 2. Source video reference

| | |
|---|---|
| File | `sage_skill_100.MP4` |
| Resolution | 1206 × 2622 (iPhone portrait, ~9:19.5) |
| Duration | 29.0 s |

### Timeline

| Time (s) | Event |
|---|---|
| 0.0 – 1.9 | Prayer screen (initial state), then back to Home |
| 2.0 – 4.5 | Home screen idle |
| ~4.6 | **Tap statue.** Fades to the Prayer screen in ~0.15 s |
| 4.7 – 7.8 | Prayer screen idle (sparkles drift over the statue) |
| ~7.8 | **Tap Pray ×100.** Tap ripple on the button |
| 7.9 | Confirm dialog appears over a blurred, darkened Prayer screen |
| ~9.5 | **Tap OK.** Dialog closes |
| 9.7 – 10.0 | Screen dims to dark grey. A faint compass-star emblem sits in the center, with a few gold sparkles |
| 10.1 | Gems 307 → 207. First item appears |
| 10.1 – ~20.3 | 100 items revealed, ~0.1 s apart (~10/s). The grid auto-scrolls |
| ~20.3 | Last item revealed. "Prayers Today: 100/10000" (top left) and the Pray ×1/×10/×100 row plus the ‹ back button slide in at the bottom |
| 20.3 – 21.4 | Remaining duplicate conversions finish (not in v1) |
| ~27.2 | **Tap ‹ back.** Crossfades (~0.2 s) to the Prayer screen with updated counters |

---

## 3. Screens

All screens render inside a fixed **1206 × 2622 logical canvas**, scaled to fit the phone viewport (see §8). Coordinates below are **percentages of that canvas** so hotspots survive scaling.

### 3.1 Home

- Background: full frame crop from ~3.0 s (`assets/home.jpg`).
- **Hotspot: statue.** x 11–41%, y 53–68%. Tapping it goes to Prayer.
- Everything else is decorative.

### 3.2 Prayer

- Background: frame crop from ~6.0 s (`assets/prayer.jpg`). Dynamic text regions get painted over with live values:

| Element | Location (approx.) | Initial | After one ×100 in video |
|---|---|---|---|
| Gem count (top right) | x 67–78%, y 10–11% | 307 | 207 |
| Orange currency | x 83–93%, y 10–11% | 5.88K | 5.88K (unchanged) |
| Point counter under top-left icon | x 5–19%, y 24–26% | 3/50 | 103/50. Icon gains a gold glow ring + red "!" badge once ≥ 50 |
| "Prayers Today: N/10000" | centered, y 64.5% | 0/10000 | 100/10000 |
| Pity line 1 | y 67.8% | "Prayer ×**27** away from a guaranteed **Legendary** skill" | ×**61** |
| Pity line 2–3 | y 69.5–72% | "**3** Legendary Skill drop(s) away from a guaranteed Sage Skill" | **2** |

"Legendary" is orange text (#F0A040-ish). The rest is white with a dark outline/shadow.

- **Hotspot: Pray ×100.** x 67–99%, y 75–79%. Shows a tap ripple and opens Confirm.
- **Hotspot: ‹ back** (bottom left). x 2–18%, y 90–95%. Returns to Home.

### 3.3 Confirm dialog

Built in HTML/CSS (not an image) so it stays crisp:
- Backdrop: Prayer screen with a blur (~8px) and ~55% black overlay
- Panel: centered, ~76% canvas width, top at y ≈ 35%. Dark header bar reading **"Confirm"** (white, bold), light grey body, small silver corner brackets
- Body text: **"Draw 100 times?"**
- Radio: "◉ Don't show again today" (grey). If checked, skip the dialog until the next local midnight (stored in `localStorage`)
- Buttons: **Cancel** (white pill) and **OK** (yellow-green pill, #D8DE6A-ish)
- Cancel closes the dialog. OK starts the draw.

### 3.4 Draw / reveal

- Background: dark grey (#2B2B2E) with a subtle diagonal-stripe texture. The faint compass-star emblem is centered behind the grid (crop from ~10.0 s, `assets/draw_bg.jpg`).
- Top bar: gem + orange currency (same position as Prayer). "Prayers Today: N/10000" appears at the top left **only after** the reveal finishes.
- The grid area runs from y ≈ 14% to y ≈ 82% of the canvas once the bottom buttons are present.

**Grid layout**
- 3 columns at x-centers ≈ 20%, 50% and 80%.
- Each row is filled in the order **Middle → Left → Right**.
- The middle item sits ~4% of canvas height **higher** than the side items in the same row, which gives the staggered honeycomb look.
- Row pitch is ≈ 11% of canvas height.
- 100 items = 33 full rows + 1 final row with only the middle item.

**Item tile**
- A circular icon (~15% canvas width) inside a colored ring, with the name centered below in white, 1–2 lines, dark outline.
- Ring color by kind:
  | Kind | Ring |
  |---|---|
  | Shard (any skill) | Grey/silver, plus a small dark badge showing **3** at the bottom right |
  | Rare skill | Blue |
  | Epic skill | Purple |
  | Legendary skill | Orange |
- Shard names are the skill name + " Shard" (e.g. "Fireball Shard"). Their icon is the skill art in a jigsaw-puzzle-piece shape.

**Reveal sequence** (per item, starting at t = 0 for item 1, then every 100 ms):
1. The item appears with a **golden halo burst**: a radial gold glow ~1.6× tile size with sparkles. It scales in from ~0.6 → 1.0 over ~150 ms.
2. The halo fades over ~600 ms, leaving just the ring.
3. **Full skills stay full skills.** In v1 there's no duplicate conversion, so a full skill keeps its icon, ring color and name.

> **Deferred: duplicate conversion.** In the video, every full skill turned into shards about 1.0–1.3 s after it appeared, because the account already owned them all. The tile flashed white-yellow (~250 ms), with small paper-like shards bursting outward. It then showed a dark translucent band across the icon, with a shard glyph and a count: **Rare → 10, Epic → 30, Legendary → 90**. The ring color stayed the same. This is kept here for a later version with skill ownership.

**Auto-scroll**
- While items are revealing, the grid scrolls smoothly so the newest row stays at ~75–80% of the viewport height. Scrolling is continuous (eased), not row-snapped.
- When the reveal ends, the bottom UI (Pray ×1 / ×10 / ×100 row at y ≈ 83–86%, and ‹ back at y ≈ 90–95%) fades/slides in. The final scroll position shows the last ~7 rows.
- After the reveal the user can scroll the grid manually to review all 100 (not shown in the video, but harmless).
- **Tap to skip** (nice-to-have): tapping during the reveal reveals the rest instantly.

### 3.5 Back to Prayer

- Tapping ‹ crossfades (~200 ms) to the Prayer screen with updated gems, Prayers Today, point counter and pity text.
- The Pray ×1 / ×10 / ×100 buttons on the result screen start a fresh draw (×100 confirms first).

---

## 4. Skill catalog (Sage)

Seen in the video. "Full" means the skill itself dropped; "Shard" means a shard of it dropped. Full-skill rarity is taken from the ring color.

| Skill | Rarity (full) | Seen as full | Seen as shard |
|---|---|---|---|
| Weakening Hex | Rare | ✓ | |
| Radiant Restoration | Rare | ✓ | |
| Unstable Aura | Rare | ✓ | ✓ |
| Heart of Flame | Rare | ✓ | ✓ |
| Water Shot | Rare | ✓ | |
| Flame Jet | Rare | ✓ | ✓ |
| Healing Mastery | Rare | ✓ | |
| Elemental Mystery | Rare | ✓ | ✓ |
| Iron Thorn | Rare | ✓ | |
| Wind's Whisper | Rare | ✓ | ✓ |
| Dew's Blessing | Rare | ✓ | ✓ |
| Ice Spike | Rare | ✓ | |
| Cyclone | Epic | ✓ | ✓ |
| Stonechief Summon | Epic | ✓ | ✓ |
| Curse Resonance | Epic | ✓ | ✓ |
| Tough Soul | Epic | ✓ | ✓ |
| Elemental Body | Epic | ✓ | |
| Shadow Erosion | Epic | ✓ | ✓ |
| Soul Spark | Epic | ✓ | |
| Soul Impact | Legendary | ✓ | |
| Water to Ice | Legendary | ✓ | ✓ |
| Blazing Fire Ring | Legendary | ✓ | ✓ |
| Tempest Sphere | Epic (from §4a) | | ✓ |
| Shadow Impact | Legendary (from §4a) | | ✓ |
| Healing Touch | Epic (from §4a) | | ✓ |
| Gale Shield | Legendary (from §4a) | | ✓ |
| Insight | Epic (from §4a) | | ✓ |
| Void Blessing | Legendary (from §4a) | | ✓ |
| Fireball | Epic (from §4a) | | ✓ |
| Treantling Summon | Legendary (from §4a) | | ✓ |
| Mana Surge | Legendary (from §4a) | | ✓ |
| Flaming Path | Legendary (from §4a) | | ✓ |
| Dark Bullet | Epic (from §4a) | | ✓ |
| Flame Wolf Summon | Epic (from §4a) | | ✓ |
| Water Assault | Legendary (from §4a) | | ✓ |
| Resurrection | Legendary (from §4a) | | ✓ |

The table above is the video's view of the Sage pool. The full data for every class is in §4a.

## 4a. All classes

**Skill data.** `skills.js` is generated by `tools/build_skills.py` from [lootandwaifus.com's skills.json](https://lootandwaifus.com/api/swordxstaff/skills.json), saved as `tools/skills.json`. It holds 328 skills across 26 classes; the 79 Monster skills are left out. Icons come from `lootandwaifus.com/skills/swordxstaff/skill_<id>.png` and are saved in `assets/skills/`. The icons cut from the video take priority wherever they exist.

**Choosing a class.** The "Sage ⌄" pill at the top right of the Prayer screen opens a list of all 26 classes, grouped by line. The chosen class is saved, and every Pray button draws only from that class's pool.

**Pools.** A class's pool is its own skills plus the skills of every class it advances from, e.g. Sage = Mage + Sage (37 skills). The overview's per-class skill lists confirm this, and the build script checks that each pool matches them.

**Class tree and rarity.** Both come from [0xnobodyyt's SxS Skills Overview](https://0xnobodyyt.github.io/sxs-skills-overview/). Its data file is saved as `tools/sxs_overview.json`. Rarity is its `quality` field: Blue = Rare, Purple = Epic, Orange = Legendary. All 22 rarities seen in the video agree with it. Totals: 106 Rare, 110 Epic, 112 Legendary.

| Base | Line (tiers 2–7) |
|---|---|
| Mage | Sorcerer → Archmage → Destroyer → Magister → Arcanarch → Thaumaturge |
| Mage | Sage → Arcanist → Dominator → Prophet → Hierarch → Demiurge |
| Warrior | Duelist → Berserker → Conqueror → Ravager → Marauder → Doomreaver |
| Warrior | Knight → Paladin → Guardian → Templar → Justicar → Vindicator |

**Shard icons.** For shards not seen in the video, the skill's art is cut into a puzzle-piece shape inside a silver ring, drawn in CSS.

## 5. Drop rates

Each pull is rolled on its own with these rates:

| Outcome | Rate |
|---|---|
| Skill shard ×3 | 70% |
| Rare skill | 22% |
| Epic skill | 7% |
| Legendary skill | 1% |

**Rolling a pull**
1. Roll the tier using the table above.
2. Pick a skill from that tier with equal odds for every skill in it. For a shard, pick from every skill that has a shard. ⚠️ Unconfirmed: whether skills or shards within a tier have their own weights. v1 uses equal odds.
3. The pity rules (§6) can override step 1.

At 1%, a Legendary shows up in 100 pulls about 63% of the time without pity. The pity rules are what make them more reliable in practice.

**The video's actual split, for comparison (n = 100):**

| Outcome | Count | Expected at the rates above |
|---|---|---|
| Shard ×3 | 56 | 70 |
| Rare skill | 31 | 22 |
| Epic skill | 10 | 7 |
| Legendary skill | 3 (pulls #22, #69, #91) | 1 |

The 3 Legendaries at a 1% rate suggest pity or a bonus mechanic helped (§6).

## 6. Pity / guarantees

| Guarantee | Every | Counter resets when you get |
|---|---|---|
| Rare or better | 10 prayers | a Rare, Epic or Legendary skill |
| Epic or better | 30 prayers | an Epic or Legendary skill |
| Legendary | 70 prayers | a Legendary skill |

**Counters.** Keep three counts of prayers since the last drop at each level: `sinceRare`, `sinceEpic` and `sinceLegendary`. A drop resets its own counter and every lower one. For example, a Legendary resets all three, and an Epic resets `sinceEpic` and `sinceRare`.

**Rolling a pull, with pity**
1. Work out the minimum tier this pull must reach:
   - `sinceLegendary` = 69 → Legendary
   - else `sinceEpic` = 29 → Epic or better
   - else `sinceRare` = 9 → Rare or better
   - else no minimum
2. Roll the tier normally (§5).
3. If the roll is below the minimum, re-roll among only the allowed tiers, keeping their relative rates. ⚠️ This is an assumption; the game may simply give the minimum tier instead. For example, a Rare-or-better guarantee gives Rare 22/30, Epic 7/30 and Legendary 1/30. An Epic-or-better guarantee gives Epic 7/8 and Legendary 1/8.
4. Add 1 to each counter, then reset the counters the result qualifies for.

**Prayer screen text.** "Prayer ×**N** away from a guaranteed Legendary skill", where N = 70 − `sinceLegendary`.

**Checked against the video.** The video's results fit these rules:
- **Legendary**: "27 away" at the start means `sinceLegendary` = 43. The Legendary at pull #22 came naturally (43 + 22 = 65 < 70). After the last Legendary at #91 there were 9 more pulls, leaving 70 − 9 = **61 away**, which matches the screen.
- **Rare or better**: the longest run without one is 4 pulls (#77–80 and #92–95), well inside 10.
- **Epic or better**: the longest run without one is 18 pulls (#33–50), inside 30.

**Starting values** (the start of the video): `sinceLegendary` = 43, `sinceEpic` = 0 and `sinceRare` = 0. The video doesn't show the last two, so 0 is a placeholder.

**Sage Skill guarantee ⚠️ TBD.** "**3** Legendary Skill drop(s) away from a guaranteed Sage Skill" went to **2** after a session with 3 Legendaries. How it counts, and what a "Sage Skill" is, is still unknown. Until it's known, v1 decrements it by 1 per ×100 session that includes a Legendary. This matches the video but is a guess.

## 7. State & persistence

Kept in `localStorage` so it survives reloads:

```json
{
  "gems": 1000,
  "orange": "5.88K",
  "prayersToday": 0,
  "prayersTodayDate": "2026-09-24",
  "points": 3,
  "sinceRare": 0,
  "sinceEpic": 0,
  "sinceLegendary": 43,
  "sagePity": 3,
  "skipConfirmUntil": null
}
```

- `prayersToday` resets at local midnight.
- Starting values match the start of the video, except gems, which start at 1000.
- A hidden **reset** (e.g. long-press the "Prayer" title for 2 s) restores the starting values.
- Gems never go below 0. There is no purchase flow in v1.

## 8. Mobile / technical

- **Stack**: a single static site with plain HTML + CSS + vanilla JS and no build step. Files: `index.html`, `style.css`, `app.js`, `assets/`.
- **Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
- **Canvas scaling**: a 1206 × 2622 stage scaled with CSS `transform: scale()` to fit `100dvh` / `100vw`, centered, with letterboxing in a dark color when the aspect ratio differs. Safe-area insets are respected.
- **Home-screen app**: `apple-mobile-web-app-capable`, a status-bar style, a touch icon and a `manifest.json` so it opens full-screen from the iOS home screen.
- **Touch**: use `pointerdown` for instant response. Disable double-tap zoom, text selection and the long-press callout. Add a light tap-ripple on hotspots.
- **Animation**: CSS transforms/opacity only, driven by a JS timeline (`requestAnimationFrame` for auto-scroll). Target 60 fps on a mid-range iPhone.
- **RNG**: `crypto.getRandomValues`. An optional `?seed=` URL param gives reproducible runs, and `?replay=video` plays back the exact 100 results from the video (Appendix A).
- **Sound**: none in v1 (the recording is silent).

## 9. Assets to crop from the video

Extract at full resolution (1206 × 2622) using AVFoundation (ffmpeg isn't installed).

| File | Source time | Notes |
|---|---|---|
| `home.jpg` | ~3.0 s | Full frame |
| `prayer.jpg` | ~6.0 s | Full frame. Dynamic text regions (§3.2) are masked and re-rendered |
| `draw_bg.jpg` | ~10.0 s | Full frame (dim + emblem), with the top currency bar masked |
| `ui_buttons.png` | ~22.0 s | Pray row + back button strip for the result screen |
| `icons/<skill>.png` | per skill | Circular icon interior only (ring drawn in CSS). Taken from a frame after the halo fades and **before** the video's duplicate conversion covers the icon (~0.6–0.9 s after reveal) |
| `icons/<skill>_shard.png` | per shard | Same approach |
| `gem.png`, `orange.png` | ~6.0 s | Currency icons |

Some icons will be partly covered by sparkles in every frame. Pick the cleanest frame, and accept minor artifacts. These are for personal use only and aren't for redistribution.

## 10. Open questions

1. ~~**Drop rates**~~: done (§5). Still open: does every skill within a tier have the same odds?
2. **Pity rules** (§6): the 10 / 30 / 70 guarantees are done. Still open:
   - When a guarantee kicks in, does it give exactly that tier, or a random tier at or above it?
   - How does the "guaranteed Sage Skill" counter work? What is a "Sage Skill", and does it look different in the reveal?
3. ~~**Skill rarities and class tree**~~: done (§4a).
4. **Top-left counter (3/50 → 103/50)**: what it is, and whether anything should happen at 50 (the icon glows and gets a "!").
5. ~~**Ownership**~~: done. Full skills stay full skills for now (§3.4).

---

## Appendix A — Exact results from the video

Row order is **M, L, R**. Pull # = 3·(row−1)+1 / +2 / +3. (R) Rare, (E) Epic, (L) Legendary. Anything else is a ×3 shard.

| Row | Middle | Left | Right |
|---|---|---|---|
| 1 | Tempest Sphere Shard | Weakening Hex (R) | Wind's Whisper Shard |
| 2 | Shadow Impact Shard | Unstable Aura Shard | Heart of Flame Shard |
| 3 | Radiant Restoration (R) | Cyclone (E) | Heart of Flame Shard |
| 4 | Water to Ice Shard | Unstable Aura (R) | Heart of Flame (R) |
| 5 | Healing Touch Shard | Water Shot (R) | Tempest Sphere Shard |
| 6 | Flame Jet (R) | Shadow Impact Shard | Elemental Mystery Shard |
| 7 | Healing Mastery (R) | Heart of Flame (R) | Tempest Sphere Shard |
| 8 | **Soul Impact (L)** | Gale Shield Shard | Stonechief Summon (E) |
| 9 | Insight Shard | Healing Mastery (R) | Void Blessing Shard |
| 10 | Water to Ice Shard | Curse Resonance (E) | Fireball Shard |
| 11 | Elemental Mystery (R) | Tough Soul (E) | Treantling Summon Shard |
| 12 | Mana Surge Shard | Iron Thorn (R) | Dew's Blessing Shard |
| 13 | Curse Resonance Shard | Flaming Path Shard | Elemental Mystery (R) |
| 14 | Dark Bullet Shard | Weakening Hex (R) | Heart of Flame (R) |
| 15 | Flame Jet Shard | Water to Ice Shard | Treantling Summon Shard |
| 16 | Flame Wolf Summon Shard | Heart of Flame (R) | Shadow Impact Shard |
| 17 | Gale Shield Shard | Elemental Mystery Shard | Curse Resonance (E) |
| 18 | Dark Bullet Shard | Wind's Whisper Shard | Dark Bullet Shard |
| 19 | Wind's Whisper (R) | Dew's Blessing (R) | Water Assault Shard |
| 20 | Heart of Flame Shard | Elemental Body (E) | Tough Soul Shard |
| 21 | Stonechief Summon Shard | Ice Spike (R) | Weakening Hex (R) |
| 22 | Stonechief Summon Shard | Stonechief Summon (E) | Cyclone Shard |
| 23 | Stonechief Summon Shard | Dark Bullet Shard | **Water to Ice (L)** |
| 24 | Shadow Erosion Shard | Ice Spike (R) | Ice Spike (R) |
| 25 | Flame Jet (R) | Shadow Erosion (E) | Water Shot (R) |
| 26 | Wind's Whisper (R) | Resurrection Shard | Blazing Fire Ring Shard |
| 27 | Tempest Sphere Shard | Healing Touch Shard | Weakening Hex (R) |
| 28 | Healing Mastery (R) | Elemental Mystery (R) | Heart of Flame Shard |
| 29 | Fireball Shard | Unstable Aura (R) | Flame Jet Shard |
| 30 | Soul Spark (E) | Flame Wolf Summon Shard | Curse Resonance Shard |
| 31 | **Blazing Fire Ring (L)** | Shadow Erosion Shard | Shadow Erosion Shard |
| 32 | Insight Shard | Flaming Path Shard | Weakening Hex (R) |
| 33 | Cyclone (E) | Healing Mastery (R) | Iron Thorn (R) |
| 34 | Flame Jet Shard | — | — |
