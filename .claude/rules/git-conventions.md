# PR / Branch / Commit Conventions

Applies to all PRs, including those opened by automated agents.

## Issues

- We use issues for project planning
- Issues must have a clear title describing the what.
- The issue body should describe the what and why and focus on
  business improvements. Reduce technical information to the
  non-obvious how only!
- Attach detailed implementation plans as a comment to the issue, not in the issue body.
- We use issues to track and plan work, and to document decisions.

## Branch name

- `feature/123-short-but-clear-slug` with a GitHub issue, `feature/short-but-clear-slug` without.
- Lowercase kebab-case

## Commits

- [Conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) with a leading emoji:
`✨ feat(#123): short but clear commit message`. The body explains the *why* and any non-obvious
*what*, and references the issue or spec section.
- Types and their emoji: ✨ feat · 🐛 fix · 📝 docs · ♻️ refactor · 🎨 style · ⚡️ perf · ✅ test ·
🧑‍💻 chore · 🚧 wip · 🔥 remove · 🚑 hotfix · 🔒 security

## Pull requests

```
## Summary
[2-3 sentences]

## Changes
[Bulleted list]

## Testing
[How to test]

## Notes
[Deployment considerations]
```

Attach any relevant plans or decisions as the first PR comment.
