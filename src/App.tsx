import { useState, useEffect } from 'react';
import SearchBar from './components/search-bar/search-bar';
import IvCalculator from './components/iv-calculator/iv-calculator';
import { getBaseStats } from './services/poke-api';

interface HistoryItem {
  id: number;
  name: string;
  sprite: string;
  data: any;
}

const getPokemonSpriteUrl = (pokemon: any, mode: 'classic' | 'official' = 'classic') => {
  if (!pokemon) return '';

  const dexId = pokemon.dex ?? pokemon.id;
  const speciesId = pokemon.speciesId ? String(pokemon.speciesId) : '';
  const normalizedSpecies = speciesId ? speciesId.replace(/_/g, '-') : '';

  const url = mode === 'official'
    ? normalizedSpecies
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${normalizedSpecies}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`
    : normalizedSpecies
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${normalizedSpecies}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;

  console.log('[sprite lookup]', {
    name: pokemon.speciesName ?? pokemon.name,
    dexId,
    speciesId,
    normalizedSpecies,
    mode,
    url,
  });

  return url;
};

const getFallbackSpriteUrl = (pokemon: any, mode: 'classic' | 'official' = 'classic') => {
  if (!pokemon) return '';
  const dexId = pokemon.dex ?? pokemon.id;
  return mode === 'official'
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;
};

export default function App() {
  const [selectedPokemon, setSelectedPokemon] = useState<any | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('poke_iv_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleSelectPokemon = (pokemon: any | null) => {
    setSelectedPokemon(pokemon);
    if (!pokemon) return;

    const officialSprite = getPokemonSpriteUrl(pokemon, 'classic');

    setHistory((prevHistory) => {
      const filtered = prevHistory.filter((item) => item.id !== pokemon.dex);
      const newItem = {
        id: pokemon.dex,
        name: pokemon.speciesName,
        sprite: officialSprite,
        data: pokemon
      };
      const updatedHistory = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('poke_iv_history', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const currentSprite = selectedPokemon ? getPokemonSpriteUrl(selectedPokemon, 'official') : '';
  const fallbackCurrentSprite = selectedPokemon ? getFallbackSpriteUrl(selectedPokemon, 'official') : '';
  const baseStats = selectedPokemon ? getBaseStats(selectedPokemon) : undefined;

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
                  className={`flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border p-1.5 px-3 rounded-xl cursor-pointer transition-all ${selectedPokemon?.dex === item.id ? 'border-amber-500 bg-slate-700' : 'border-slate-700'
                    }`}
                >
                  <img
                    src={item.sprite}
                    alt={item.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const fallback = getFallbackSpriteUrl(item.data, 'classic');
                      console.warn('[sprite fallback]', {
                        name: item.name,
                        attempted: target.currentSrc || target.src,
                        fallback,
                      });
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                  <span className="text-xs font-medium capitalize">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tarjeta de información */}
        {selectedPokemon && baseStats && (
          <div className="bg-slate-800 text-white p-4 rounded-2xl mb-4 border border-slate-700 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-2 rounded-xl border border-slate-700">
                <img
                  src={currentSprite}
                  alt={selectedPokemon.speciesName}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    console.warn('[sprite fallback]', {
                      name: selectedPokemon.speciesName,
                      attempted: target.currentSrc || target.src,
                      fallback: fallbackCurrentSprite,
                    });
                    if (target.src !== fallbackCurrentSprite) {
                      target.src = fallbackCurrentSprite;
                    }
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Nº {selectedPokemon.dex}</p>
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
