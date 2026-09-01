import PokemonSprite from '../pokemon-sprite/pokemon-sprite';
import MegaSymbol from '../mega-symbol/mega-symbol';
import ShadowSymbol from '../shadow-symbol/shadow-symbol';
import { specialForm } from '../../services/poke-api';
import type { IvValues } from '../iv-calculator/iv-calculator';

export interface PinnedAnalysis {
    id: string;
    pokemon: any;
    ivValues: IvValues;
}

interface PinnedAnalysesProps {
    analyses: PinnedAnalysis[];
    activeId?: string;
    onSelect: (analysis: PinnedAnalysis) => void;
    onRemove: (id: string) => void;
    onRemoveAll: () => void;
}

export default function PinnedAnalyses({ analyses, activeId, onSelect, onRemove, onRemoveAll }: PinnedAnalysesProps) {
    if (analyses.length === 0) return null;

    return (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <span aria-hidden="true">📌</span> Análisis fijados
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{analyses.length}/8</span>
                    <button
                        type="button"
                        onClick={onRemoveAll}
                        className="cursor-pointer text-[10px] font-semibold text-slate-500 hover:text-red-300"
                        title="Eliminar todos los análisis fijados"
                    >
                        Eliminar todos
                    </button>
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {analyses.map((analysis) => {
                    const form = specialForm(analysis.pokemon);
                    return (
                        <div
                            key={analysis.id}
                            className={`relative flex shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 ${activeId === analysis.id
                                ? 'border-amber-500 bg-slate-700'
                                : 'border-slate-700 bg-slate-800'
                                }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(analysis)}
                                className="flex cursor-pointer items-center gap-2 text-left hover:opacity-80"
                                title="Abrir análisis"
                            >
                                <span className="relative inline-flex shrink-0">
                                    <PokemonSprite
                                        pokemon={analysis.pokemon}
                                        variant="icon"
                                        size={32}
                                        className="h-8 w-8 object-contain"
                                    />
                                    {form === 'mega' && <MegaSymbol className="absolute -bottom-1 -left-1 h-4 w-4" />}
                                    {form === 'shadow' && <ShadowSymbol className="absolute -bottom-1 -left-1 h-4 w-4" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block max-w-28 truncate text-xs font-medium capitalize">
                                        {analysis.pokemon.speciesName}
                                    </span>
                                    <span className="block whitespace-nowrap text-[10px] text-slate-400">
                                        {analysis.ivValues.attack}/{analysis.ivValues.defense}/{analysis.ivValues.stamina} · Nv. {analysis.ivValues.level}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(analysis.id)}
                                className="cursor-pointer self-start px-1 text-xs leading-none text-slate-500 hover:text-red-300"
                                aria-label={`Eliminar análisis de ${analysis.pokemon.speciesName}`}
                                title="Eliminar análisis"
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
