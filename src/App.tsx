import { useState, useEffect, useMemo } from 'react';
import SearchBar from './components/search-bar/search-bar';
import IvCalculator from './components/iv-calculator/iv-calculator';
import type { IvValues } from './components/iv-calculator/iv-calculator';
import PinnedAnalyses, { type PinnedAnalysis } from './components/pinned-analyses/pinned-analyses';
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
const PINNED_KEY = 'poke_iv_pinned_analyses';

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
  const [ivValues, setIvValues] = useState<IvValues>({ attack: 15, defense: 15, stamina: 15, level: 20 });
  const [pinnedAnalyses, setPinnedAnalyses] = useState<PinnedAnalysis[]>([]);

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

  useEffect(() => {
    const savedPinned = localStorage.getItem(PINNED_KEY);
    if (!savedPinned) return;
    try {
      const parsed = JSON.parse(savedPinned);
      if (Array.isArray(parsed)) setPinnedAnalyses(parsed);
    } catch (e) {
      console.warn('Análisis fijados ilegibles, se descartan.', e);
      localStorage.removeItem(PINNED_KEY);
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

  const handlePinAnalysis = () => {
    if (!selectedPokemon) return;

    const id = `${speciesKey(selectedPokemon)}:${ivValues.attack}-${ivValues.defense}-${ivValues.stamina}:${ivValues.level}`;
    setPinnedAnalyses((previous) => {
      const updated = [
        { id, pokemon: selectedPokemon, ivValues },
        ...previous.filter((analysis) => analysis.id !== id),
      ].slice(0, 8);
      localStorage.setItem(PINNED_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectPinnedAnalysis = (analysis: PinnedAnalysis) => {
    setSelectedPokemon(analysis.pokemon);
    setIvValues(analysis.ivValues);
  };

  const handleRemovePinnedAnalysis = (id: string) => {
    setPinnedAnalyses((previous) => {
      const updated = previous.filter((analysis) => analysis.id !== id);
      localStorage.setItem(PINNED_KEY, JSON.stringify(updated));
      return updated;
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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
        {/* Título y buscador comparten fila: la cabecera de antes se comía casi
            un cuarto de la primera pantalla para no decir nada. */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h1 className="shrink-0 text-lg font-black uppercase tracking-[0.18em] text-amber-400">
            Poké IV Checker
          </h1>
          <div className="min-w-0 flex-1">
            <SearchBar
              onSelectPokemon={handleSelectPokemon}
              history={history}
              selectedPokemonId={selectedKey}
              onClearHistory={() => {
                setHistory([]);
                localStorage.removeItem(HISTORY_KEY);
              }}
            />
          </div>
        </header>

        <PinnedAnalyses
          analyses={pinnedAnalyses}
          activeId={selectedPokemon ? `${selectedKey}:${ivValues.attack}-${ivValues.defense}-${ivValues.stamina}:${ivValues.level}` : undefined}
          onSelect={handleSelectPinnedAnalysis}
          onRemove={handleRemovePinnedAnalysis}
          onRemoveAll={() => {
            setPinnedAnalyses([]);
            localStorage.removeItem(PINNED_KEY);
          }}
        />

        {/* Dos columnas arriba —tarjeta y calculadora— y el ranking ocupando la
            fila de abajo entera: IvCalculator devuelve las dos secciones sueltas
            y la del ranking pide `lg:col-span-2`. Sin Pokémon elegido no hay
            tarjeta ni ranking, y la calculadora se queda con todo el ancho. */}
        <div
          className={`flex flex-col gap-4 ${selectedPokemon && baseStats
            ? 'lg:grid lg:grid-cols-[320px_minmax(0,1fr)]'
            : ''
            }`}
        >
          {selectedPokemon && baseStats && (
            <div
              className="relative overflow-hidden rounded-2xl border border-slate-800 p-4 text-white shadow-lg"
              style={{
                backgroundImage: cardGradient,
                backgroundColor: 'var(--color-slate-900)',
                ...(formColor ? { borderColor: `${formColor}66` } : {}),
              }}
            >
              {/* La marca de forma va en la esquina de la tarjeta y no encima del
                  arte: sobre el sprite tapaba una pata o un ala según el Pokémon. */}
              {form && (
                <div className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-slate-950/60 p-1 shadow-lg backdrop-blur-sm">
                  {form === 'mega' ? (
                    <MegaSymbol className="h-8 w-8" />
                  ) : (
                    <ShadowSymbol className="h-8 w-8" />
                  )}
                </div>
              )}

              <div className="relative flex flex-col items-center text-center">
                <PokemonSprite
                  pokemon={selectedPokemon}
                  variant="artwork"
                  size={144}
                  className="h-44 w-44 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
                />

                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Nº {selectedPokemon.dex}
                </p>
                <h2 className="text-lg font-bold capitalize leading-tight text-amber-300">
                  {selectedPokemon.speciesName}
                </h2>

                <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                  {types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>

                <div className="mt-3 grid w-full grid-cols-3 gap-2">
                  {(
                    [
                      ['Atk', baseStats.atk],
                      ['Def', baseStats.def],
                      ['HP', baseStats.hp],
                    ] as const
                  ).map(([etiqueta, valor]) => (
                    <div
                      key={etiqueta}
                      className="flex flex-col items-center rounded-lg border border-slate-700/60 bg-slate-950/60 px-2 py-1.5 backdrop-blur-sm"
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        {etiqueta}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums">{valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {familyMembers.length > 1 && (
                <div className="relative mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Familia
                  </p>
                  {/* Con scroll propio: las líneas con megas y Shadow llegan a doce
                      entradas y estiraban la tarjeta muy por debajo del pliegue. */}
                  <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {familyMembers.map((member) => {
                      const activo = selectedKey === speciesKey(member);
                      const formaMiembro = specialForm(member);
                      return (
                        <button
                          key={speciesKey(member)}
                          onClick={() => setSelectedPokemon(member)}
                          className={`flex h-full cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${activo
                            ? 'border-amber-500 bg-slate-950/80'
                            : 'border-white/10 bg-slate-950/40 hover:bg-slate-950/70'
                            }`}
                        >
                          <span className="relative inline-flex">
                            <PokemonSprite
                              pokemon={member}
                              variant="icon"
                              size={40}
                              className="h-10 w-10 object-contain"
                            />
                            {formaMiembro === 'mega' && (
                              <MegaSymbol className="absolute -right-1 -top-1 h-5 w-5" />
                            )}
                            {formaMiembro === 'shadow' && (
                              <ShadowSymbol className="absolute -right-1 -top-1 h-5 w-5" />
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

          <IvCalculator
            baseStats={baseStats}
            pokemon={selectedPokemon}
            ivValues={ivValues}
            onIvValuesChange={setIvValues}
            onPinAnalysis={handlePinAnalysis}
          />
        </div>
      </div>
    </div>
  );
}
