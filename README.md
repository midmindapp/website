# 🏡 MidMind website

Static MidMind website, deployed to GitHub Pages on every push to `main` (`.github/workflows/deployment.yaml`). No build step.

## Design system

The site is built on the MidMind Design System (`@midmind/ui`), following its website UI kit.

- `assets/mm/` – vendored **unchanged** from the design system (`styles.css`, `tokens/`, `components/components.css`, `fonts/`). To update, copy the new files over; don't edit them here.
- `assets/brand.svg` – SVG sprite with the logo mark, wordmark and the icons used, taken from the design system's `Logo.jsx` / `Icon.jsx`. Use via `<svg><use href="assets/brand.svg#mark"/></svg>`; it takes the text colour.
- `assets/site.css` – page layout around the `mm-*` components. Colours only via `var(--mm-*)` tokens, never hex values, or night mode breaks.
- Pages set `class="mm-root" data-mm-theme="system"` on `<html>`, so they follow the visitor's light/dark setting.

## Local preview

```sh
python3 -m http.server
```

Then open http://localhost:8000.
