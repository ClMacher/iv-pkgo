Precompute rankings

Usage

1. Install node dependencies if needed.
2. Run:

```bash
node scripts/precompute-rankings.js --top 500 --species all
```

By default, the script writes to `public/precomputed`, which is the folder the browser can read directly.

Output

- Writes gzipped JSON files under `public/precomputed/<speciesId>/<league>.json.gz`
- Leagues: `1500`, `2500`, `master`

Optional custom output

```bash
node scripts/precompute-rankings.js --top 500 --out custom-output --species all
```

Notes

- Script expects `src/data/gamemaster.json` and either `src/data/cp_multiplier.json` or network access to pogoapi.
- Adjust `--top` to change how many top entries to keep.
