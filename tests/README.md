# Tests

`regression.mjs` replays the scenarios from `docs/AUDIT.md` against the real app
in headless Chromium and asserts the outcomes: backup/restore, double taps,
undo, replace, input bounds, honest RPE, reload mid-workout, finishing early,
corrupted and partial saves, two open copies, the plan generator, and rest days.

```sh
python3 -m http.server 8765 &      # from the repo root
npm i -g playwright                # once, if Playwright is not installed
node tests/regression.mjs          # exit code = number of failures
```

Options: `BUNYAN_URL` (default `http://localhost:8765/index.html`),
`CHROMIUM` (path to a Chromium binary), `PW_PATH` (directory to resolve
`playwright` from, e.g. the global `node_modules/`).

Run it before every merge. What it cannot cover — iOS Safari, the Home Screen
app, the lock screen, audio and the keyboard — is the manual checklist in
`docs/AUDIT.md`, section H.
