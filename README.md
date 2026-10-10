# 🏡 MidMind website

Static MidMind website, deployed to GitHub Pages on every push to `main` (`.github/workflows/deployment.yaml`). No build step.

## Design system

The site is built on the MidMind Design System (`@midmind/ui`), following its website UI kit.

- `assets/mm/` – vendored **unchanged** from the design system (`styles.css`, `tokens/`, `components/components.css`, `fonts/`). To update, copy the new files over; don't edit them here.
- `assets/brand.svg` – SVG sprite with the logo mark, wordmark and the icons used, taken from the design system's `Logo.jsx` / `Icon.jsx`. Use via `<svg><use href="assets/brand.svg#mark"/></svg>`; it takes the text colour.
- `assets/site.css` – page layout around the `mm-*` components. Colours only via `var(--mm-*)` tokens, never hex values, or night mode breaks.
- Pages set `class="mm-root" data-mm-theme="system"` on `<html>`, so they follow the visitor's light/dark setting.

## Example answers

The cards under "Frag so, wie du denkst." open the app's real answer to that question. `assets/site.js` loads it from the app without a login (`GET {app}/preview/answers/{id}`) and lays it out like the app's AnswerCard. Words come in one after another, using the "Streaming text" transition from transitions.dev. A card's `data-preview` is the question's id in the app's `midmind.preview.questions` (`application.yaml`). Keep the card's question text in sync with it.

- `assets/vendor/marked.esm.js` – [marked](https://github.com/markedjs/marked) 15.0.12, vendored unchanged, renders the explanation's Markdown.
- For now `{app}` is the local app at `http://localhost:8080` (`API` in `assets/site.js`). It becomes `https://app.midmind.de` once that host runs the new app. Start the local app with `MIDMIND_PREVIEW_ALLOWED_ORIGINS=http://localhost:8000` so its CORS lets the local site in.

## Local preview

```sh
python3 -m http.server
```

Then open http://localhost:8000.
