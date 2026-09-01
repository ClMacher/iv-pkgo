import { useState, useEffect, useMemo } from 'react';
import SearchBar from './components/search-bar/search-bar';
import IvCalculator from './components/iv-calculator/iv-calculator';
import PokemonSprite from './components/pokemon-sprite/pokemon-sprite';
import { getBaseStats, specialForm, pokemonTypes } from './services/poke-api';
import { typeGradient, MEGA_GRADIENT } from './services/type-colors';
import TypeBadge from './components/type-badge/type-badge';
import MegaSymbol from './components/mega-symbol/mega-symbol';
import ShadowSymbol from './components/shadow-symbol/shadow-symbol';
import gamemaster from './data/gamemaster.json';

interface HistoryItem {
  /** speciesId, no dex: Venusaur y Mega Venusaur son ambos el dex 3. */
  id: string;
  name: string;
  data: any;
}

const HISTORY_KEY = 'poke_iv_history';

/** Único rastro que queda de la forma: un tinte en el borde de la tarjeta. */
const FORM_COLOR = {
  shadow: '#a855f7',
  mega: '#22d3ee',
} as const;

function speciesKey(pokemon: any): string {
  return String(pokemon?.speciesId ?? pokemon?.dex ?? '');
}

const POKEMON_BY_ID: Map<string, any> = new Map(
  ((gamemaster as any).pokemon ?? []).map((p: any) => [String(p.speciesId), p]),
);

/**
 * Especie de la que cuelga una forma que no evoluciona por su cuenta.
 * `charizard_mega_x` -> `charizard`, `mewtwo_shadow` -> `mewtwo`.
 */
function baseSpeciesId(speciesId: string): string {
  return String(speciesId).replace(/_(shadow|mega(_[xy])?|primal)$/, '');
}

/**
 * Referencias por las que dos entradas se consideran de la misma familia.
 *
 * El gamemaster no le pone `family` a 31 de las 61 megas —Mega Alakazam entre
 * ellas—, así que se quedaban fuera de su propia línea evolutiva. Cuando falta,
 * se heredan las referencias de la especie base. Eso también agrupa a los que
 * no evolucionan, como Mewtwo con sus dos megas.
 */
function getFamilyRefs(pokemon: any): string[] {
  if (!pokemon) return [];

  const refs = new Set<string>();

  const acumular = (entry: any) => {
    const family = entry?.family ?? {};
    if (family.id) refs.add(String(family.id));
    if (family.parent) refs.add(String(family.parent));
    if (entry?.speciesId) refs.add(String(entry.speciesId));
    if (Array.isArray(family.evolutions)) {
      family.evolutions.forEach((e: string) => refs.add(String(e)));
    }
  };

  acumular(pokemon);

  const base = baseSpeciesId(pokemon.speciesId ?? '');
  if (!pokemon.family && base !== pokemon.speciesId) {
    acumular(POKEMON_BY_ID.get(base));
  }

  return [...refs];
}

/**
 * Orden dentro de la familia: primero las formas normales, después las megas y
 * las Shadow al final. Antes salían intercaladas —Charmander, Charmander
 * Shadow, Charmeleon...— y no se leía la línea evolutiva de corrido.
 */
function familyRank(pokemon: any): number {
  const tags = (pokemon?.tags ?? []) as string[];
  if (tags.includes('shadow')) return 2;
  if (tags.includes('mega')) return 1;
  return 0;
}

/** El historial guardaba `id` numérico y una URL de sprite ya calculada. */
function migrateHistory(stored: any): HistoryItem[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item) => item && item.data)
    .map((item) => ({
      id: speciesKey(item.data) || String(item.id ?? ''),
      name: item.name ?? item.data?.speciesName ?? '',
      data: item.data,
    }))
    .filter((item) => item.id);
}

export default function App() {
  const [selectedPokemon, setSelectedPokemon] = useState<any | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (!savedHistory) return;
    try {
      setHistory(migrateHistory(JSON.parse(savedHistory)));
    } catch (e) {
      console.warn('Historial ilegible, se descarta.', e);
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const handleSelectPokemon = (pokemon: any | null) => {
    setSelectedPokemon(pokemon);
    if (!pokemon) return;

    const id = speciesKey(pokemon);
    if (!id) return;

    setHistory((prevHistory) => {
      const filtered = prevHistory.filter((item) => item.id !== id);
      const newItem: HistoryItem = {
        id,
        name: pokemon.speciesName,
        data: pokemon,
      };
      const updatedHistory = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const baseStats = selectedPokemon ? getBaseStats(selectedPokemon) : undefined;
  const form = specialForm(selectedPokemon);
  const formColor = form ? FORM_COLOR[form] : null;
  const types = pokemonTypes(selectedPokemon);
  // Una mega se identifica por su piedra, no por su tipo, así que manda el irisado.
  const cardGradient = form === 'mega' ? MEGA_GRADIENT : typeGradient(types);
  const selectedKey = selectedPokemon ? speciesKey(selectedPokemon) : '';

  const familyMembers = useMemo(() => {
    if (!selectedPokemon) return [];

    const refs = new Set(getFamilyRefs(selectedPokemon));
    const allPokemon = ((gamemaster as any).pokemon ?? []) as any[];
    const unique = new Map<string, any>();

    unique.set(speciesKey(selectedPokemon), selectedPokemon);

    allPokemon.forEach((entry) => {
      const key = speciesKey(entry);
      if (unique.has(key)) return;
      if (getFamilyRefs(entry).some((ref) => refs.has(ref))) unique.set(key, entry);
    });

    // El seleccionado ya no se fija arriba: ordenada entera, la línea evolutiva
    // se lee de corrido, y el borde ámbar sigue marcando cuál está activo.
    return [...unique.values()].sort((a, b) => {
      const porForma = familyRank(a) - familyRank(b);
      if (porForma !== 0) return porForma;
      const porDex = (a.dex ?? 0) - (b.dex ?? 0);
      if (porDex !== 0) return porDex;
      return speciesKey(a).localeCompare(speciesKey(b));
    });
  }, [selectedPokemon]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-3xl font-black text-amber-400 mb-8 uppercase tracking-wide text-center">
          Poké IV Checker
        </h1>

        <div className="mx-auto max-w-[1200px] space-y-4">
          <SearchBar
            onSelectPokemon={handleSelectPokemon}
            history={history}
            selectedPokemonId={selectedKey}
          />

          {/* Sin Pokémon elegido no hay tarjeta, y la calculadora ocupa todo. */}
          <div
            className={`flex flex-col gap-4 ${selectedPokemon && baseStats
              ? 'lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start'
              : ''
              }`}
          >
            {selectedPokemon && baseStats && (
              <div
                className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg"
                style={{
                  backgroundImage: cardGradient,
                  ...(formColor ? { borderColor: `${formColor}66` } : {}),
                }}
              >
                <div className="relative flex flex-col items-center text-center">
                  <span className="relative">
                    <PokemonSprite
                      pokemon={selectedPokemon}
                      variant="artwork"
                      size={144}
                      className="h-64 w-64 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
                    />
                    {form === 'mega' && (
                      <MegaSymbol className="absolute -bottom-1 -left-1 h-10 w-10" />
                    )}
                    {form === 'shadow' && (
                      <ShadowSymbol className="absolute -bottom-1 -left-1 h-10 w-10" />
                    )}
                  </span>

                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Nº {selectedPokemon.dex}
                  </p>
                  <h2 className="text-xl font-bold capitalize leading-tight text-amber-300">
                    {selectedPokemon.speciesName}
                  </h2>

                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>

                  <div className="mt-4 grid w-full grid-cols-3 gap-2">
                    {(
                      [
                        ['Atk', baseStats.atk],
                        ['Def', baseStats.def],
                        ['HP', baseStats.hp],
                      ] as const
                    ).map(([etiqueta, valor]) => (
                      <div
                        key={etiqueta}
                        className="flex flex-col items-center rounded-lg border border-slate-700/60 bg-slate-900/60 px-2 py-1.5 backdrop-blur-sm"
                      >
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          {etiqueta}
                        </span>
                        <span className="font-mono text-sm font-bold">{valor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {familyMembers.length > 1 && (
                  <div className="relative mt-5 border-t border-white/10 pt-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Familia
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {familyMembers.map((member) => {
                        const activo = selectedKey === speciesKey(member);
                        return (
                          <button
                            key={speciesKey(member)}
                            onClick={() => setSelectedPokemon(member)}
                            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${activo
                              ? 'border-amber-500 bg-slate-900/80'
                              : 'border-white/10 bg-slate-900/40 hover:bg-slate-900/70'
                              }`}
                          >
                            <span className="relative inline-flex">
                              <PokemonSprite
                                pokemon={member}
                                variant="icon"
                                size={40}
                                className="h-10 w-10 object-contain"
                              />
                              {specialForm(member) === 'mega' && (
                                <MegaSymbol className="absolute -bottom-1 -left-1 h-5 w-5" />
                              )}
                              {specialForm(member) === 'shadow' && (
                                <ShadowSymbol className="absolute -bottom-1 -left-1 h-5 w-5" />
                              )}
                            </span>
                            <span className="line-clamp-2 w-full text-center text-[10px] font-medium capitalize leading-tight text-slate-300">
                              {member.speciesName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <IvCalculator baseStats={baseStats} pokemon={selectedPokemon} />
          </div>
        </div>
      </div>
    </div>
  );
}
