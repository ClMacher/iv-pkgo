import { useState, useEffect } from 'react';
import { searchLocalPokemon, searchLocalSuggestions, pokemonTypes, specialForm } from '../../services/poke-api';
import PokemonSprite from '../pokemon-sprite/pokemon-sprite';
import TypeBadge from '../type-badge/type-badge';
import MegaSymbol from '../mega-symbol/mega-symbol';
import ShadowSymbol from '../shadow-symbol/shadow-symbol';

interface SearchBarProps {
    onSelectPokemon: (pokemon: any | null) => void;
    history?: Array<{ id: string; name: string; data: any }>;
    selectedPokemonId?: string;
}

export default function SearchBar({ onSelectPokemon, history = [], selectedPokemonId }: SearchBarProps) {
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

    const handleFocus = () => {
        setIsInputFocused(true);
        if (query.trim()) {
            setSuggestions(searchLocalSuggestions(query, 8));
        }
    };

    const handleSelectSuggestion = (p: any) => {
        setQuery(p.speciesName);
        setSuggestions([]);
        setIsInputFocused(false);
        onSelectPokemon(p);
    };

    const handleSelectHistory = (item: SearchBarProps['history'][number]) => {
        setQuery(item.name);
        setIsInputFocused(false);
        onSelectPokemon(item.data);
    };

    return (
        <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Busca por nombre o Nº de Pokédex..."
                    value={query}
                    onFocus={handleFocus}
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
            {isInputFocused && (suggestions.length > 0 || history.length > 0) && (
                <div className="absolute left-0 right-0 z-20 mt-2 max-h-96 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
                    {history.length > 0 && (
                        <div className={`${suggestions.length > 0 ? 'border-b border-slate-700/60' : ''} p-3`}>
                            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                Historial
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectHistory(item);
                                        }}
                                        className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors ${selectedPokemonId === item.id
                                            ? 'border-amber-500 bg-slate-700'
                                            : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                                            }`}
                                    >
                                        <span className="relative inline-flex shrink-0">
                                            <PokemonSprite
                                                pokemon={item.data}
                                                variant="icon"
                                                size={28}
                                                className="h-7 w-7 object-contain"
                                            />
                                            {specialForm(item.data) === 'mega' && (
                                                <MegaSymbol className="absolute -bottom-1 -left-1 h-4 w-4" />
                                            )}
                                            {specialForm(item.data) === 'shadow' && (
                                                <ShadowSymbol className="absolute -bottom-1 -left-1 h-4 w-4" />
                                            )}
                                        </span>
                                        <span className="whitespace-nowrap text-xs font-medium capitalize">
                                            {item.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                            <span className="relative inline-flex shrink-0">
                                <PokemonSprite
                                    pokemon={s}
                                    variant="icon"
                                    size={48}
                                    className="w-12 h-12 object-contain"
                                />
                                {specialForm(s) === 'mega' && (
                                    <MegaSymbol className="absolute -bottom-1 -left-1 h-5 w-5" />
                                )}
                                {specialForm(s) === 'shadow' && (
                                    <ShadowSymbol className="absolute -bottom-1 -left-1 h-5 w-5" />
                                )}
                            </span>
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
