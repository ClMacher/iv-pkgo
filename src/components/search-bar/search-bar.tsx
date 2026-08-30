import { useState, useEffect } from 'react';
import { searchLocalPokemon, searchLocalSuggestions } from '../../services/poke-api';

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
                <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    {suggestions.map((s) => (
                        <button
                            key={s.speciesId}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(s);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3"
                        >
                            <img
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.dex}.png`}
                                alt={s.speciesName}
                                className="w-6 h-6 object-contain"
                            />
                            <span className="capitalize">{s.speciesName} <span className="text-xs text-slate-400">#{s.dex}</span></span>
                        </button>
                    ))}
                </div>
            )}
            {error && <p className="text-red-400 text-xs mt-2 text-center">Pokémon no encontrado en el GameMaster.</p>}
        </form>
    );
}
