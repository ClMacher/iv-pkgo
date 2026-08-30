#!/usr/bin/env node
/*
 Precompute rankings script
 Usage:
  node scripts/precompute-rankings.js --top 500 --out precomputed --species all

 Outputs gzipped JSON files under <out>/<speciesId>/<league>.json.gz
 League values: 1500,2500,master
*/

import fs from "fs/promises";
import { gzipSync } from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POGOAPI_CPM_URL = "https://pogoapi.net/api/v1/cp_multiplier.json";
const DEFAULT_TOP = 500;
const DEFAULT_OUT = path.resolve(process.cwd(), "public", "precomputed");
const GAMEMASTER_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  "gamemaster.json",
);
const LOCAL_CPM_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  "cp_multiplier.json",
);

function parseArgs() {
  const args = process.argv.slice(2);
  let out = DEFAULT_OUT;
  let top = DEFAULT_TOP;
  let speciesArg = "all";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--top" && args[i + 1]) {
      top = Number(args[i + 1]);
      i++;
    } else if (a === "--out" && args[i + 1]) {
      out = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (a === "--species" && args[i + 1]) {
      speciesArg = args[i + 1];
      i++;
    }
  }
  return { top: Number(top), out: out, speciesArg };
}

function computeCpWithCpm(baseAtk, baseDef, baseHp, atkIv, defIv, hpIv, cpm) {
  const atk = baseAtk + atkIv;
  const def = baseDef + defIv;
  const hp = baseHp + hpIv;
  const cp = Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp) * cpm ** 2) / 10);
  return Math.max(10, cp);
}

async function loadGamemaster() {
  const txt = await fs.readFile(GAMEMASTER_PATH, "utf8");
  const jm = JSON.parse(txt);

  if (Array.isArray(jm)) return jm;
  if (Array.isArray(jm.pokemon)) return jm.pokemon;

  return Object.values(jm).filter(
    (item) => item && typeof item === "object" && item.dex && item.baseStats,
  );
}

async function loadCpMultipliers() {
  let raw = null;

  try {
    const txt = await fs.readFile(LOCAL_CPM_PATH, "utf8");
    raw = JSON.parse(txt);
  } catch (err) {
    try {
      const res = await fetch(POGOAPI_CPM_URL);
      raw = await res.json();
    } catch (e) {
      console.error("Failed to load CP multipliers", e);
      throw e;
    }
  }

  const map = {};
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (item && typeof item.level !== "undefined") {
        map[Number(item.level)] = Number(item.multiplier ?? item.value ?? 0);
      }
    });
    return map;
  }

  Object.entries(raw || {}).forEach(([k, value]) => {
    const numeric = Number(
      value && typeof value === "object"
        ? (value.multiplier ?? value.value ?? 0)
        : (value ?? 0),
    );
    if (Number.isFinite(numeric)) map[Number(k)] = numeric;
  });

  return map;
}

function levelsFromMap(cpMap) {
  return Object.keys(cpMap)
    .map(Number)
    .sort((a, b) => a - b);
}

function binarySearchMaxLevel(
  levels,
  cpMap,
  baseAtk,
  baseDef,
  baseHp,
  atkIv,
  defIv,
  hpIv,
  cap,
) {
  // returns level (number) or null if none <= cap
  if (cap == null) return levels[levels.length - 1]; // master: return max level
  let lo = 0,
    hi = levels.length - 1,
    best = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const lvl = levels[mid];
    const cpm = cpMap[lvl];
    const cp = computeCpWithCpm(
      baseAtk,
      baseDef,
      baseHp,
      atkIv,
      defIv,
      hpIv,
      cpm,
    );
    if (cp <= cap) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best === -1) return null;
  return levels[best];
}

function ensureDir(p) {
  return fs.mkdir(p, { recursive: true });
}

async function writeGzJson(filePath, obj) {
  const txt = JSON.stringify(obj);
  const gz = gzipSync(Buffer.from(txt, "utf8"));
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, gz);
}

async function processSpecies(species, cpMap, levels, outDir, topN) {
  const dex = species.dex ?? species.id ?? species.speciesId ?? null;
  const name =
    species.name ?? species.speciesName ?? species.species ?? `dex${dex}`;
  if (!dex || !species.baseStats) return null;
  const base = species.baseStats; // {atk,def,hp}

  const leagues = [1500, 2500, null]; // null for master
  const resultsByLeague = {};

  for (const leagueCap of leagues) {
    const list = [];
    // iterate 4096 combos
    for (let a = 0; a <= 15; a++) {
      for (let d = 0; d <= 15; d++) {
        for (let s = 0; s <= 15; s++) {
          const bestLevel = binarySearchMaxLevel(
            levels,
            cpMap,
            base.atk,
            base.def,
            base.hp,
            a,
            d,
            s,
            leagueCap,
          );
          if (bestLevel === null) continue; // no valid level <= cap
          const cpm = cpMap[bestLevel];
          const atkReal = (base.atk + a) * cpm;
          const defReal = (base.def + d) * cpm;
          const hpReal = Math.floor((base.hp + s) * cpm);
          const product = atkReal * defReal * hpReal;
          const cpAtBest = computeCpWithCpm(
            base.atk,
            base.def,
            base.hp,
            a,
            d,
            s,
            cpm,
          );
          list.push({
            atk: a,
            def: d,
            hp: s,
            sum: a + d + s,
            cp: cpAtBest,
            bestLevel,
            product,
          });
        }
      }
    }

    // sort by product desc, then cp desc, then sum desc, then atk desc
    list.sort((x, y) => {
      if (y.product !== x.product) return y.product - x.product;
      if (y.cp !== x.cp) return y.cp - x.cp;
      if (y.sum !== x.sum) return y.sum - x.sum;
      if (y.atk !== x.atk) return y.atk - x.atk;
      return y.def - x.def;
    });

    const bestProduct = list[0]?.product ?? 0;

    // build map and top
    const map = {};
    list.forEach((it, idx) => {
      const key = `${it.atk}-${it.def}-${it.hp}`;
      map[key] = {
        rank: idx + 1,
        cp: it.cp,
        lvl: it.bestLevel,
        statProduct: it.product,
        pct: bestProduct > 0 ? (it.product / bestProduct) * 100 : 100,
      };
    });

    const top = list.slice(0, topN).map((it, idx) => ({
      rank: idx + 1,
      atk: it.atk,
      def: it.def,
      hp: it.hp,
      sum: it.sum,
      cp: it.cp,
      lvl: it.bestLevel,
      statProduct: it.product,
      pct: bestProduct > 0 ? (it.product / bestProduct) * 100 : 100,
    }));

    const all = list.map((it, idx) => ({
      rank: idx + 1,
      atk: it.atk,
      def: it.def,
      hp: it.hp,
      sum: it.sum,
      cp: it.cp,
      lvl: it.bestLevel,
      statProduct: it.product,
      pct: bestProduct > 0 ? (it.product / bestProduct) * 100 : 100,
    }));

    resultsByLeague[leagueCap === null ? "master" : String(leagueCap)] = {
      meta: {
        species: dex,
        name,
        league: leagueCap === null ? "master" : leagueCap,
        total: list.length,
        generatedAt: new Date().toISOString(),
      },
      top,
      all,
      map,
    };
  }

  // write files
  for (const [leagueKey, data] of Object.entries(resultsByLeague)) {
    const outPath = path.join(outDir, String(dex), `${leagueKey}.json.gz`);
    await writeGzJson(outPath, data);
  }
  return { dex, name };
}

async function main() {
  const { top, out, speciesArg } = parseArgs();
  console.log(
    "Precompute rankings — top=",
    top,
    "out=",
    out,
    "species=",
    speciesArg,
  );
  const cpMap = await loadCpMultipliers();
  const levels = levelsFromMap(cpMap);
  const gm = await loadGamemaster();

  let speciesList = gm;
  if (speciesArg && speciesArg !== "all") {
    const wanted = speciesArg.split(",").map((x) => x.trim());
    speciesList = gm.filter(
      (s) =>
        wanted.includes(String(s.dex)) ||
        wanted.includes(String(s.species)) ||
        wanted.includes((s.name || "").toLowerCase()),
    );
  }

  await ensureDir(out);
  for (const sp of speciesList) {
    try {
      const meta = await processSpecies(sp, cpMap, levels, out, top);
      if (meta) console.log("Wrote species", meta.dex, meta.name);
    } catch (e) {
      console.error("Failed species", sp.dex ?? sp.id, e);
    }
  }
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
