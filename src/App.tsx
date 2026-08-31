import { useState, useEffect } from 'react';
import SearchBar from './components/search-bar/search-bar';
import IvCalculator from './components/iv-calculator/iv-calculator';
import PokemonSprite from './components/pokemon-sprite/pokemon-sprite';
import { getBaseStats, specialForm } from './services/poke-api';

interface HistoryItem {
  /** speciesId, no dex: Venusaur y Mega Venusaur son ambos el dex 3. */
  id: string;
  name: string;
  data: any;
}

const HISTORY_KEY = 'poke_iv_history';

/**
 * Colores de las formas especiales. Son los mismos tonos que usa el halo de
 * PokemonSprite, para que la tarjeta y el sprite no digan cosas distintas.
 */
const FORM_STYLE = {
  shadow: { label: 'Shadow', color: '#a855f7' },
  mega: { label: 'Mega', color: '#22d3ee' },
} as const;

function speciesKey(pokemon: any): string {
  return String(pokemon?.speciesId ?? pokemon?.dex ?? '');
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
  const formStyle = form ? FORM_STYLE[form] : null;
  const selectedKey = selectedPokemon ? speciesKey(selectedPokemon) : '';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-black text-amber-400 mb-8 uppercase tracking-wide">
        Poké IV Checker
      </h1>

      <div className="w-full max-w-md space-y-4">
        <SearchBar onSelectPokemon={handleSelectPokemon} />

        {/* Historial */}
        {history.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Historial
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPokemon(item.data)}
                  className={`flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border p-1.5 px-3 rounded-xl cursor-pointer transition-all ${selectedKey === item.id ? 'border-amber-500 bg-slate-700' : 'border-slate-700'
                    }`}
                >
                  <PokemonSprite
                    pokemon={item.data}
                    variant="icon"
                    size={24}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-xs font-medium capitalize">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tarjeta de información */}
        {selectedPokemon && baseStats && (
          <div
            className="bg-slate-800 text-white p-4 rounded-2xl mb-4 border border-slate-700 flex items-center justify-between shadow-lg"
            style={formStyle ? { borderColor: `${formStyle.color}66` } : undefined}
          >
            <div className="flex items-center gap-4">
              <div
                className="bg-slate-900 p-2 rounded-xl border border-slate-700"
                style={formStyle ? { borderColor: `${formStyle.color}80` } : undefined}
              >
                <PokemonSprite
                  pokemon={selectedPokemon}
                  variant="artwork"
                  size={96}
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2">
                  Nº {selectedPokemon.dex}
                  {formStyle && (
                    <span
                      className="px-1.5 py-px rounded text-[10px] tracking-wide"
                      style={{
                        color: formStyle.color,
                        backgroundColor: `${formStyle.color}26`,
                        border: `1px solid ${formStyle.color}59`,
                      }}
                    >
                      {formStyle.label}
                    </span>
                  )}
                </p>
                <h2 className="text-xl font-bold capitalize text-amber-300">{selectedPokemon.speciesName}</h2>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 space-y-0.5">
              <p>Atk: <span className="text-white font-mono">{baseStats.atk}</span></p>
              <p>Def: <span className="text-white font-mono">{baseStats.def}</span></p>
              <p>HP: <span className="text-white font-mono">{baseStats.hp}</span></p>
            </div>
          </div>
        )}

        <IvCalculator baseStats={baseStats} pokemon={selectedPokemon} />
      </div>
    </div>
  );
}
