import { useState, useEffect } from 'react';
import { searchLocalPokemon, searchLocalSuggestions, pokemonTypes } from '../../services/poke-api';
import PokemonSprite from '../pokemon-sprite/pokemon-sprite';
import TypeBadge from '../type-badge/type-badge';

interface SearchBarProps {
    onSelectPokemon: (pokemon: any | null) => void;
}

export default function SearchBar({ onSelectPokemon }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [error, setError] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        setError(false);
        const data = searchLocalPokemon(query);

        if (data) {
            onSelectPokemon(data);
        } else {
            setError(true);
            onSelectPokemon(null);
        }
    };

    useEffect(() => {
        if (!isInputFocused || !query || query.trim().length < 1) {
            setSuggestions([]);
            return;
        }
        const results = searchLocalSuggestions(query, 8);
        setSuggestions(results);
    }, [query, isInputFocused]);

    const handleSelectSuggestion = (p: any) => {
        setQuery(p.speciesName);
        setSuggestions([]);
        setIsInputFocused(false);
        onSelectPokemon(p);
    };

    return (
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-6 relative">
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Busca por nombre o Nº de Pokédex..."
                    value={query}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
                <button
                    type="submit"
                    className="bg-amber-500 text-slate-950 font-bold px-5 py-2 rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                >
                    Buscar
                </button>
            </div>
            {isInputFocused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-2 max-h-96 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
                    {suggestions.map((s) => (
                        <button
                            key={s.speciesId}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(s);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-700/60 last:border-b-0"
                        >
                            <PokemonSprite
                                pokemon={s}
                                variant="icon"
                                size={48}
                                className="w-12 h-12 object-contain shrink-0"
                            />
                            <span className="flex-1 min-w-0">
                                <span className="block capitalize truncate font-semibold">{s.speciesName}</span>
                                <span className="mt-1 flex flex-wrap gap-1">
                                    {pokemonTypes(s).map((t) => (
                                        <TypeBadge key={t} type={t} />
                                    ))}
                                </span>
                            </span>
                            <span className="shrink-0 text-sm text-slate-400 tabular-nums">#{s.dex}</span>
                        </button>
                    ))}
                </div>
            )}
            {error && <p className="text-red-400 text-xs mt-2 text-center">Pokémon no encontrado en el GameMaster.</p>}
        </form>
    );
}
