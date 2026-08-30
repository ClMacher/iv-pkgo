import gamemaster from "../data/gamemaster.json";

interface PvPokePokemon {
  dex: number;
  speciesName: string;
  speciesId: string;
  baseStats: {
    atk: number;
    def: number;
    hp: number;
  };
}

export function searchLocalPokemon(query: string): PvPokePokemon | null {
  const cleanQuery = query.toLowerCase().trim();
  const pokemonList = (gamemaster as any).pokemon as PvPokePokemon[];

  // 1. Intentamos buscar primero por número de Pokédex si el usuario digitó un número
  const isNumber = !isNaN(Number(cleanQuery)) && cleanQuery !== "";
  if (isNumber) {
    const foundByDex = pokemonList.find((p) => p.dex === Number(cleanQuery));
    if (foundByDex) return foundByDex;
  }

  // 2. Si no es número, buscamos por concordancia de texto (ignorando mayúsculas)
  const foundByName = pokemonList.find(
    (p) =>
      p.speciesName.toLowerCase() === cleanQuery ||
      p.speciesId.toLowerCase() === cleanQuery,
  );

  return foundByName || null;
}

export function searchLocalSuggestions(
  query: string,
  limit = 8,
): PvPokePokemon[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const pokemonList = (gamemaster as any).pokemon as PvPokePokemon[];

  // Priorizar nombres que empiezan con la query, luego los que la contienen
  const startsWith = pokemonList.filter(
    (p) =>
      p.speciesName.toLowerCase().startsWith(cleanQuery) ||
      p.speciesId.toLowerCase().startsWith(cleanQuery),
  );

  const contains = pokemonList.filter(
    (p) =>
      !p.speciesName.toLowerCase().startsWith(cleanQuery) &&
      (p.speciesName.toLowerCase().includes(cleanQuery) ||
        p.speciesId.toLowerCase().includes(cleanQuery)),
  );

  const results = [...startsWith, ...contains].slice(0, limit);
  return results;
}

export function getBaseStats(pokemon: PvPokePokemon) {
  return {
    atk: pokemon.baseStats.atk,
    def: pokemon.baseStats.def,
    hp: pokemon.baseStats.hp,
  };
}

export async function fetchCpMultipliers(): Promise<Record<number, number>> {
  try {
    const res = await fetch("https://pogoapi.net/api/v1/cp_multiplier.json");
    if (!res.ok) throw new Error("Failed to fetch CPM");
    const data = await res.json();
    const map: Record<number, number> = {};
    data.forEach((item: any) => {
      map[item.level] = item.multiplier;
    });
    return map;
  } catch (err) {
    console.warn("Could not load cp multipliers:", err);
    return {};
  }
}

// --- Precomputed rankings fetch + cache ---
type PrecomputedData = {
  meta: any;
  top: any[];
  map: Record<string, any>;
};

function saveCachedRanking(key: string, data: PrecomputedData) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn(
      "LocalStorage quota exceeded while caching ranking; skipping cache write.",
      e,
    );
  }
}

const DEFAULT_TTL_HOURS = 24;

function storageKey(
  speciesId: string | number,
  league: string | number,
  top?: number | "all",
) {
  const normalizedTop =
    top === undefined
      ? "all"
      : top === "all"
        ? "all"
        : Math.max(1, Math.floor(top));
  return `precalc:${speciesId}:${league}:${normalizedTop}`;
}

function computeCpWithCpm(
  baseAtk: number,
  baseDef: number,
  baseHp: number,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cpm: number,
) {
  const atk = baseAtk + atkIv;
  const def = baseDef + defIv;
  const hp = baseHp + hpIv;
  const cp = Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp) * cpm ** 2) / 10);
  return Math.max(10, cp);
}

function levelsFromMap(cpMap: Record<number, number>) {
  return Object.keys(cpMap)
    .map(Number)
    .sort((a, b) => a - b);
}

function binarySearchMaxLevel(
  levels: number[],
  cpMap: Record<number, number>,
  baseAtk: number,
  baseDef: number,
  baseHp: number,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cap: number | null,
) {
  if (cap == null) return levels[levels.length - 1];

  let lo = 0;
  let hi = levels.length - 1;
  let best = -1;

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

  return best === -1 ? null : levels[best];
}

async function generateOnDemandRanking(
  speciesId: string | number,
  league: number | "master" = "master",
  topN = 500,
): Promise<PrecomputedData | null> {
  const species = ((gamemaster as any).pokemon ?? []).find(
    (p: any) =>
      String(p.dex) === String(speciesId) ||
      String(p.speciesId) === String(speciesId),
  );

  if (!species || !species.baseStats) return null;

  const cpMap = await fetchCpMultipliers();
  const levels = levelsFromMap(cpMap);
  if (!levels.length) return null;

  const leagueCap = league === "master" ? null : Number(league);
  const list: Array<{
    atk: number;
    def: number;
    hp: number;
    sum: number;
    cp: number;
    bestLevel: number;
    product: number;
  }> = [];

  for (let atk = 0; atk <= 15; atk++) {
    for (let def = 0; def <= 15; def++) {
      for (let hp = 0; hp <= 15; hp++) {
        const bestLevel = binarySearchMaxLevel(
          levels,
          cpMap,
          species.baseStats.atk,
          species.baseStats.def,
          species.baseStats.hp,
          atk,
          def,
          hp,
          leagueCap,
        );

        if (bestLevel === null) continue;

        const cpm = cpMap[bestLevel];
        const atkReal = (species.baseStats.atk + atk) * cpm;
        const defReal = (species.baseStats.def + def) * cpm;
        const hpReal = Math.floor((species.baseStats.hp + hp) * cpm);
        const product = atkReal * defReal * hpReal;
        const cp = computeCpWithCpm(
          species.baseStats.atk,
          species.baseStats.def,
          species.baseStats.hp,
          atk,
          def,
          hp,
          cpm,
        );

        list.push({
          atk,
          def,
          hp,
          sum: atk + def + hp,
          cp,
          bestLevel,
          product,
        });
      }
    }
  }

  list.sort((x, y) => {
    if (y.product !== x.product) return y.product - x.product;
    if (y.cp !== x.cp) return y.cp - x.cp;
    if (y.sum !== x.sum) return y.sum - x.sum;
    if (y.atk !== x.atk) return y.atk - x.atk;
    return y.def - x.def;
  });

  const bestProduct = list[0]?.product ?? 0;
  const map: Record<string, any> = {};

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

  return {
    meta: {
      species: Number(species.dex),
      name: species.speciesName,
      league: league === "master" ? "master" : String(league),
      total: list.length,
      generatedAt: new Date().toISOString(),
    },
    top,
    map,
  };
}

export async function fetchPrecomputedRanking(
  speciesId: string | number,
  league: number | "master" = "master",
  opts?: { force?: boolean; ttlHours?: number; top?: number },
): Promise<PrecomputedData | null> {
  const key = storageKey(speciesId, league, opts?.top ?? 4096);
  const ttl = (opts && opts.ttlHours) || DEFAULT_TTL_HOURS;

  if (!opts || !opts.force) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts) {
          const ageMs = Date.now() - parsed.ts;
          if (ageMs < ttl * 3600 * 1000 && parsed.data)
            return parsed.data as PrecomputedData;
        }
      }
    } catch (e) {
      console.warn("Failed reading precomputed cache", e);
    }
  }

  // Try fetch JSON then .json.gz
  const base = `/precomputed/${speciesId}`;
  const leagueKey = league === "master" ? "master" : String(league);
  const urls = [`${base}/${leagueKey}.json`, `${base}/${leagueKey}.json.gz`];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (
        contentType.includes("text/html") ||
        contentType.includes("text/plain")
      ) {
        continue;
      }

      // If content-type is JSON or URL ends with .json — parse normally
      if (contentType.includes("application/json") || url.endsWith(".json")) {
        const text = await res.text();
        const trimmed = text.trim();
        if (
          !trimmed ||
          trimmed.startsWith("<!doctype") ||
          trimmed.startsWith("<html")
        ) {
          continue;
        }
        const data = JSON.parse(trimmed);
        saveCachedRanking(key, data as PrecomputedData);
        return data as PrecomputedData;
      }

      // If gzipped file, try DecompressionStream (browser support)
      if (url.endsWith(".gz")) {
        if (
          typeof window !== "undefined" &&
          typeof (window as any).DecompressionStream === "function"
        ) {
          const blob = await res.blob();
          const ds = new (window as any).DecompressionStream("gzip");
          const decompressedStream = blob.stream().pipeThrough(ds);
          const text = await new Response(decompressedStream).text();
          const trimmed = text.trim();
          if (
            !trimmed ||
            trimmed.startsWith("<!doctype") ||
            trimmed.startsWith("<html")
          ) {
            continue;
          }
          const data = JSON.parse(trimmed);
          saveCachedRanking(key, data as PrecomputedData);
          return data as PrecomputedData;
        } else {
          console.warn(
            "DecompressionStream unavailable in this browser; cannot decompress .gz",
          );
          continue;
        }
      }
    } catch (e) {
      console.warn("Failed fetching precomputed url", url, e);
      continue;
    }
  }

  try {
    const generated = await generateOnDemandRanking(
      speciesId,
      league,
      opts?.top ?? 500,
    );
    if (generated) {
      saveCachedRanking(key, generated);
      return generated;
    }
  } catch (e) {
    console.warn("Failed generating ranking on demand", speciesId, league, e);
  }

  return null;
}

export function clearPrecomputedCache(
  speciesId?: string | number,
  league?: string | number,
) {
  if (speciesId && league) {
    localStorage.removeItem(storageKey(speciesId, league));
    return;
  }
  // clear all precomputed keys
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("precalc:")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Failed clearing precomputed cache", e);
  }
}
