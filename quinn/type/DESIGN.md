# Typing Game — Design Doc

A relaxing, encouragement-only typing game for kids. No timers that punish, no game-over, no falling-words-of-death. Progress comes from the player getting genuinely faster.

## Goals

- Teach all keys on a standard US keyboard, starting from the home row index fingers and ending at the rarest shifted punctuation.
- Feel calm and friendly. Gentle visuals, soft audio, never punitive.
- It is impossible to "lose." The only feedback loop is: type accurately → speed climbs → level advances → bigger score.
- Multiple kids can share one browser via named local profiles, with export/import for moving between machines.

## Non-goals

- No multiplayer, no leaderboard, no accounts/auth.
- No timed challenges or sudden-death modes.
- No mobile/touch typing (a real keyboard is assumed).
- No internationalization v1. US ANSI layout, English text.

## Tech stack

- Static site: HTML + CSS + vanilla JavaScript (ES modules). No build step, no framework.
- Persistence: `localStorage`, one key per user profile plus an index key.
- Audio: HTML `<audio>` (one loop track + a few small SFX). All audio muted by default until the user enables it, with a persistent mute toggle.
- Graphics: SVG flowers + CSS animations. No canvas, no game engine.
- Hosted as plain files; runs from `file://` or any static host.

Rationale: the game is small, the dependencies would outweigh the code, and a 7-year-old's parent should be able to read the source.

### Running locally

ES modules don't load from `file://` in browsers, so serve the directory with the included dev server. From the project root:

```
python3 serve.py
```

then visit `http://localhost:8765`. The server sets `Cache-Control: no-store` on every response so edited JS modules are always re-fetched — no hard-reloads needed. (The `.claude/launch.json` configures the Claude Code preview to use the same script.)

## Screens & navigation

```
   ┌────────────┐         ┌──────────┐
   │   Home     │ ──────▶ │   Test   │ ──┐
   │ (profiles) │ ◀────── │          │   │
   └────────────┘         └──────────┘   │
         ▲                               ▼
         │                          ┌──────────┐
         └───────────────────────── │ Practice │
                                    └──────────┘
```

- **Home**: pick a profile or create one. From Home → Test (first time) or Practice (returning).
- **Test**: placement only. Must complete before reaching Practice for the first time. Can be re-entered from Practice via a "Re-test my level" button. Cancellable back to Home with no level change.
- **Practice**: the main experience. Buttons: "Home", "Re-test", "Mute".

## Data model

One profile per kid. Stored as JSON under `typeGame.profile.<id>`; an index lives at `typeGame.profiles`.

```ts
Profile {
  id: string                      // uuid
  name: string                    // displayed
  createdAt: ISOString
  level: number                   // index into CHAR_ORDER; chars [0..level-1] are unlocked
  charStats: {
    [char: string]: {
      samples: number[]           // recent inter-keystroke ms times, bounded length
      attempts: number            // lifetime count
      errors: number              // lifetime count
    }
  }
  audio: { musicOn: boolean, sfxOn: boolean }
  lastPlayed: ISOString
}
```

- Export: a button on the profile card downloads `<name>.typegame.json` (the Profile blob, plus a small `schemaVersion`).
- Import: file picker on Home; warns before overwriting an existing name.
- Schema versioning from day one so future shape changes don't nuke saves.

## Character progression (`CHAR_ORDER`)

The ordered list a player walks through. Level `N` means the player has unlocked the first `N` characters. Level 0 is "nothing learned yet."

Order, grouped:

1. **Home row index fingers**: `f j`
2. **Home row middle/ring/pinky**: `d k s l a ;`
3. **Index reaches on home row**: `g h`
4. **Space** (right thumb). Once unlocked, short two-word flowers can appear (e.g. `a a`, `as ask`).
5. **Top row, index first**: `r u`
6. **Top row outward**: `e i w o q p`
7. **Top row index reaches**: `t y`
8. **Enter** (right pinky). Once unlocked, occasional two-word flowers separate the words by a line break, requiring Enter between them.
9. **Bottom row, index first**: `v m`
10. **Bottom row outward**: `c , x . z /`
11. **Bottom row index reaches**: `b n`
12. **Capital letters** — each capital `A`–`Z` is its own level, presented in the same order as the lowercase letters above (`F J D K S L A G H R U E I W O Q P T Y V M C X Z B N`). Each capital has its own intro lesson describing both the shift to use (opposite-hand pinky) and the finger for the letter: e.g. *"For `F`, hold Right Shift with your right pinky and press `f` with your left index finger."*
13. **Number row**: `4 7 3 8 5 6 2 9 1 0`
14. **Shifted top-row punctuation**: `$ & # * % ^ @ ( ! )`
15. **Remaining unshifted punctuation**: `' [ ] - = \``
16. **Shifted remaining punctuation**: `" { } _ + ~ : < > ?`

Each character carries metadata: which finger, which shift (where applicable), a short instruction string, and an SVG keyboard highlight.

The level numbering of milestones (used by the WPM ramp below): end of lowercase row characters incl. space/enter = level **32**; end of capital letters = level **58**; final level = **94**.

## Test mode (placement)

Goal: estimate the highest character the player can already type and set `level` accordingly.

**Testable characters**: `CHAR_ORDER` minus Space and Enter — their display glyphs (␣ ↵) confuse new users.

Algorithm — binary search with soft boundaries over `TESTABLE` (92 chars), one character per trial, up to **15 trials** total.

- Start with `lo = 0`, `hi = len(TESTABLE) - 1`, `probe = floor((lo+hi)/2)`.
- Each trial: show the probe character as a single flower. **Pass** = correct keystroke; **Fail** = wrong keystroke or 2-second timeout.
- Boundaries harden gradually — a probe must fail **twice consecutively** to move `hi` down, or pass **twice consecutively** to move `lo` up:
  - **Soft fail** (1st fail): explore left half (`lo..probe-1`), remember this probe as a pending retry.
  - **Soft pass** (1st pass): if there is a pending soft-fail probe, retry it; otherwise explore right.
  - **Hard fail** (2nd consecutive fail): `hi = probe - 1`, then standard midpoint of remaining range.
  - **Hard pass** (2nd consecutive pass): `lo = probe + 1`, then standard midpoint of remaining range.
- Stop when `lo > hi` or 15 trials are used.
- **Level** = CHAR_ORDER index of the most recent successful char + 2 (floor 1). This places the proven char into the seeded history and makes the next character the fresh challenge.

Example with 7 chars, starting at char 4:

| Trial | Char | Result | Notes |
|-------|------|--------|-------|
| 1 | 4 | Fail | Soft fail → try char 2 |
| 2 | 2 | Pass | Soft pass → retry char 4 (pending soft fail) |
| 3 | 4 | Fail | Hard fail → `hi=3`, try char 2 again |
| 4 | 2 | Pass | Hard pass → `lo=3`, `hi=3`, try char 3 |

Notes:
- Single characters only — no words or speed measurement. Test is purely correct/incorrect.
- 15 trials ≈ 30–60 seconds.
- Re-test overwrites `level` to whatever placement finds, even if lower.
- Visual: same flower aesthetic as Practice, single flower at a time, trial counter shown.

## Practice mode (the main loop)

### Visuals

- Pastel background, soft drifting clouds (CSS).
- **Exactly one untyped flower on screen at a time.** The player never picks what to type next. A new flower drifts in only after the current one is completed.
- A completed flower may linger briefly as it animates away while the next one is already drifting in, but only one is "active" (accepting keystrokes) at any moment.
- Flowers enter from the bottom, drift gently upward and sideways, exit at top after completion.
- HUD (top corner): profile name, **Level N**, **AWPHM: NNN**, mute toggle, Home/Re-test buttons.

### What gets shown on a flower

The "prompt generator" pulls from a queue weighted toward:
1. Any character whose rolling WPM is below the **review threshold** (20 WPM) — heaviest weight.
2. The most recently unlocked character — medium weight.
3. Anything else the player has unlocked — light weight.

Prompt type:
- **Level 1 (only `f j`)**: single characters.
- **Once ≥ 4 letters unlocked**: mix of single characters and short real words built from unlocked letters; fall back to pronounceable nonsense (e.g. `fad`, `jaff`) when the unlocked set is too small to form many real words. Word list bundled with the app, pre-filtered into buckets by "uses only these letters."
- **Once Shift is unlocked**: occasionally capitalized words.
- **Once Space is unlocked**: occasionally two-word phrases.

### Typing & feedback

- Each character on the flower is rendered separately. As the player types correctly, the typed character changes color (e.g. green) and the cursor moves to the next character.
- **Wrong key**: the target character shakes briefly and flashes (e.g. soft red), and a quiet "nope" tick plays. The wrong key is not accepted — the player must hit the correct key to continue. The error is recorded in `charStats.errors` for the character that *should* have been typed and that character's most recent sample is discarded.
- **Flower complete**: gentle bloom animation + soft chime, flower drifts off, next one is already on-screen.

### Speed measurement

For **every** correctly typed character, including the first character of each flower:
- `dt_ms` = time from the moment the character became the active target (either the flower first appeared, or the previous character on the flower was just correctly typed) to the correct keystroke.
- Append `dt_ms` to `charStats[char].samples`, capped at the last 50 samples (FIFO).
- Per-char WPM = `60000 / (median(samples) * 5)`.

Counting the first character means "thinking time" between flowers is part of the measurement — which is fine: it captures the realistic cost of recognizing and starting on a new prompt.

### Thresholds (level-scaled)

Both the advancement and review thresholds depend on the player's current level, ramping up so beginners aren't asked for unrealistic speed.

**Advance threshold** `T_advance(level)` — piecewise linear:
- Level 1 → **4 WPM**
- Level 32 (end of lowercase block, including space + enter) → **8 WPM**
- Level 58 (end of capital letters) → **12 WPM**
- Level > 58 → constant **12 WPM**

Linear interpolation between breakpoints. Rounded to one decimal for display.

**Review threshold** `T_review(level) = T_advance(level) / 2`. So at level 1 a character only needs to stay above 5 WPM; at level 58+ it's 20 WPM.

### Advancement rule (level up)

Player advances to `level+1` (unlocking the next character) when **all** of:
1. Every unlocked character has ≥ 5 samples in its rolling buffer.
2. Every unlocked character's median WPM ≥ `T_advance(level)`.

On advancement: the queue pauses, a friendly modal appears showing the new character on a keyboard diagram with the correct finger highlighted and a sentence like *"This is `r`. Reach up with your left index finger."* (For capitals, the modal also shows the opposite-hand shift key with its finger highlighted.) Player clicks Continue, then the new character is heavily weighted in the queue.

### Expert mastery (level 94)

Level 94 is the final level — all 94 characters are unlocked. When a player at level 94 meets the advancement criteria across every character (the "would level up to 95" moment), a one-time congratulatory modal appears (fanfare + ★ icon, "You're an Expert!"). The flag `profile.masteryAchieved` is set so the modal only fires once. After dismissal, practice continues normally.

Wherever a level number would be displayed (HUD, home screen profile card), level-94 players see **"Expert"** instead of a number.

### Reinforcement rule (no demotion)

If any unlocked character's median WPM drops below `T_review(level)`, advancement is blocked until it climbs back above. The character is weighted heavily in the queue so the player naturally drills it back up. The level number itself never decreases through normal play (only re-test can lower it).

### AWPHM (the displayed score)

> "Words (five characters) per hundred minutes, weighted by coverage."

Formula:
```
playerWPM     = sum(englishFreq[c] * medianWPM[c] for c in unlocked)
              / sum(englishFreq[c]              for c in unlocked)
coverage      = sum(englishFreq[c] for c in unlocked)
              / sum(englishFreq[c] for c in ALL)
AWPHM         = round(playerWPM * 100 * coverage)
```

- `playerWPM` is frequency-weighted across unlocked characters, so common letters matter more than rare punctuation.
- `englishFreq` is a bundled table of relative frequencies for every character in `CHAR_ORDER`, normalized so the full table sums to 1. Letters dominate; punctuation contributes tiny slices.
- AWPHM is displayed live in the HUD and animates upward on each level-up (because `coverage` jumps) and as `playerWPM` climbs through practice.

## Audio

- **No background music** in v1.
- SFX: flower-complete chime, wrong-key tick, level-up fanfare. Off by default, persistent toggle (in the HUD and on Home).
- We'll ship with royalty-free assets (e.g. from freesound.org under CC0) — soft chime/bell tones, nothing harsh — bundled in `audio/`. The wrong-key sound in particular needs to be neutral, never scolding.

## Accessibility & input

- Keyboard layout assumed: US ANSI. The keyboard diagram renders that layout.
- Caps Lock detection: if the player has Caps Lock on while typing lowercase prompts, show a small non-blocking hint ("Caps Lock is on").
- Color choices avoid red/green-only signals — wrong-key feedback uses motion (shake) in addition to color.

## Open questions

(None outstanding — all v1 decisions resolved. Items to revisit after first play-testing: ramp breakpoints, advance/review threshold values, prompt-queue weighting, word list contents.)

## Implementation order (proposed, once design is signed off)

1. Home screen + profile CRUD + export/import.
2. `CHAR_ORDER`, English frequency table, character metadata.
3. Practice screen scaffolding: HUD, flower component, one prompt at a time, speed tracking, AWPHM math.
4. Word list + prompt generator.
5. Advancement/reinforcement logic + level-up modal + keyboard diagram.
6. Test mode (binary search placement).
7. Audio + polish (animations, mute, Caps Lock hint).
8. Manual QA pass with the intended player.
