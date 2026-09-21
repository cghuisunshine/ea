# ABA Supplemental Readings

Accessible reading pages for the ABA training modules: each supplemental-readings PDF
reformatted as an HTML page with a table of contents, adjustable text size, dark mode,
and narration that highlights each word as it is spoken.

## Contents

| File | Readings |
| --- | --- |
| `content.html` | Directory page — links every reading, HTML and PDF |
| `ABA_Before_Day_1_Reading.html` | Chapters 1, 2, 4 and 6 of *Teaching Students with Autism* (B.C. Ministry of Education) |
| `ABA_Module_1_Reading.html` | What ABA is (TARGET guide); misconceptions and guidelines for use (Trump et al., 2018) |
| `ABA_Module_2_Reading.html` | Observing behaviour with A-B-C data (Pratt & Dubie); antecedent interventions (Wood et al., 2018) |
| `ABA_Module_3_Reading.html` | Chaining; the Praise Note study (Wheatley et al., 2009); group contingencies (Chow & Gilmour); shaping (Sundel & Sundel) |
| `ABA_Module_4_Reading.html` | Discrete trial training; errorless learning; generalization (Burt & Whitney, 2018); naturalistic teaching (Allen & Shaw, 2011); prompting; response prompting (Collins et al., 2018) |

```
assets/          shared page styles and scripts (reader.css/js, player.css/js)
audio/<page>/    narration: one .mp3 and .words.json per section, plus narration.js
tools/           generate_aba_audio.py — the narration generator
*.pdf            the original supplemental readings
```

## Reading the pages

Open any `.html` file in a browser — the pages are plain files with no build step.
Relative paths matter: a page needs `assets/` and its `audio/` folder beside it, so open
it from this folder rather than from a copy elsewhere.

If your browser restricts local files, serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/content.html
```

In the player bar at the bottom: pick a section, press play, and the spoken word is
highlighted as you read. Double-click any word to jump the audio to that point. The
headphones button hides the player; `☰` folds the contents; `A−` / `A+` resize the text;
`◐` toggles dark mode. Reading position and playback progress are remembered per page.

## Regenerating the narration

Needs `edge-tts` and `beautifulsoup4`, plus network access to `speech.platform.bing.com`
(edge-tts streams the audio from there):

```bash
pip install edge-tts beautifulsoup4
python3 tools/generate_aba_audio.py              # every page
python3 tools/generate_aba_audio.py module-4     # one page
```

For each `<header class="hero">` and `<section class="chapter">` the script writes
`<id>.mp3` and `<id>.words.json` into the page's audio folder, rebuilds `narration.js`,
and rewrites the page so every text node is wrapped in a `<span data-tts-node>` the
player can highlight. A section whose text has not changed is skipped, so re-running
after an edit only regenerates what moved. Voice: `en-US-AriaNeural`.

Reference lists, study summaries and resource links sit inside `<details>` elements,
which the generator skips — they are on the page but not read aloud.

After regenerating, reload any open page (Cmd+Shift+R) — the player reads `narration.js`
once at load.

## Sources and use

The readings are reproductions of course materials for personal study. The TARGET
entries come from *TARGET: Texas Guide for Effective Teaching* (Texas Statewide
Leadership for Autism); several readings are articles from *TEACHING Exceptional
Children* and *Education and Treatment of Children*, whose copyright is held by their
publishers and whose terms permit printing and downloading for individual use. Each page
credits its sources in the footer. Keep this repository private.
