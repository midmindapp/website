# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This is the static MidMind marketing website. It is plain HTML, CSS and ES modules, with no build step, package manager, linter or tests. Every push to `main` deploys the repository root as-is to GitHub Pages (`.github/workflows/deployment.yaml`), so whatever is merged goes live.

Local preview (ES modules and the preview fetch need HTTP, not `file://`):

```sh
python3 -m http.server   # http://localhost:8000
```

Page copy is German, and code comments are mostly German too. Match that.

## Architecture

- **Pages:** `index.html` (landing page), `impressum.html` and `datenschutz.html`. Each sets `class="mm-root" data-mm-theme="system"` on `<html>` and loads `assets/mm/styles.css`, then `assets/site.css`.
- **Design system (`assets/mm/`):** vendored **unchanged** from the MidMind Design System (`@midmind/ui`, website UI kit). Never edit these files. To update, copy the new files over from the design system. The source export lives in `.claude/design-system/`.
  - The page markup uses its `mm-*` component classes.
  - Site-specific layout lives in `assets/site.css` under `w-*` classes.
  - Colours come only from `var(--mm-*)` tokens, never hex values, or dark mode breaks.
- **Icons and logo:** `assets/brand.svg` is an SVG sprite (logo mark, wordmark, icons), taken from the design system's `Logo.jsx` / `Icon.jsx`. Use it via `<svg><use href="assets/brand.svg#id"/></svg>`. The icons take `currentColor`.
- **Example answers (`assets/site.js`):** the only JS. It wires up the `.w-ex[data-preview]` cards in `index.html`.
  - Clicking a card opens a dialog that fetches `GET ${API}/preview/answers/{id}` from the MidMind app (`API = 'https://app.midmind.de'`, no login).
  - The answer is rendered to mirror the app's AnswerCard (`midmind-app` `chat/Answer.tsx`), with the explanation's Markdown rendered by the vendored `assets/vendor/marked.esm.js`.
  - The words fade in using the "Streaming text" transition from transitions.dev.
  - Each card has four attributes, plus the question text in its body:
    - `data-preview` must be a question id in the app's `midmind.preview.questions` (`application.yaml`).
    - `data-question` and the card's text must stay in sync with the app.
    - `data-phase` picks the category badge (`schwangerschaft` / `geburt` / `wochenbett` / `abrechnung`).
  - The app's CORS (`MIDMIND_PREVIEW_ALLOWED_ORIGINS`) must allow the site's origin. To test against a local app, set `API` to `http://localhost:8080` and start the app with `MIDMIND_PREVIEW_ALLOWED_ORIGINS=http://localhost:8000`.

## Conventions

Branch, commit, issue and PR rules are in `.claude/rules/git-conventions.md`. In short: branches are named `feature/<issue>-slug` and commits use emoji conventional commits (`✨ feat(#123): …`).
