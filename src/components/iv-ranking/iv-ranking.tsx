import { useEffect, useMemo, useRef, useState } from 'react';

export type League = 'great' | 'ultra' | 'master';

export interface RankedCombo {
    atk: number;
    def: number;
    hp: number;
    cp: number;
    sum: number;
    bestLevel: number;
    statProduct: number;
    pct: number;
}

interface IvRankingProps {
    lists: Record<League, RankedCombo[]>;
    attack: number;
    defense: number;
    stamina: number;
    className?: string;
}

const LEAGUES: Array<{ id: League; label: string; icon: string }> = [
    { id: 'great', label: 'Great', icon: '/assets/leagues/pogo_great_league.webp' },
    { id: 'ultra', label: 'Ultra', icon: '/assets/leagues/pogo_ultra_league.webp' },
    { id: 'master', label: 'Master', icon: '/assets/leagues/pogo_master_league.webp' },
];

const TOP_OPTIONS: Array<number | 'all'> = [10, 50, 100, 500, 'all'];

/**
 * Filas que se montan de una tanda; el resto entra al acercarse al final del
 * scroll. "Todas" son 4096 combinaciones y pintarlas de golpe deja la pestaña
 * bloqueada casi un segundo.
 */
const CHUNK = 250;

/** Constante para que la liga sin datos no devuelva un array nuevo por render. */
const SIN_DATOS: RankedCombo[] = [];

/**
 * Color del número de posición. Sin píldora: el número suelto y grande se lee
 * de un vistazo al recorrer la columna, y el tono lo separa por tramos —oro,
 * plata y bronce en el podio, verde hasta el décimo y neutro de ahí en
 * adelante—.
 */
function rankTextClass(rank: number, isCurrent: boolean): string {
    if (isCurrent) return 'text-amber-300';
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-slate-200';
    if (rank === 3) return 'text-orange-400';
    if (rank <= 10) return 'text-emerald-400';
    return 'text-slate-500';
}

/**
 * Tabla de las 4096 combinaciones de IV ordenadas por producto de estadísticas.
 *
 * Vive en su propia tarjeta y no dentro de la calculadora porque es lo único
 * que pide ancho completo: con el filtro en "Todas" ocupa la pantalla entera, y
 * el resto de la interfaz tiene que seguir cabiendo arriba sin scroll.
 */
export default function IvRanking({ lists, attack, defense, stamina, className = '' }: IvRankingProps) {
    const [league, setLeague] = useState<League>('great');
    const [top, setTop] = useState<number | 'all'>(50);
    const [renderLimit, setRenderLimit] = useState(CHUNK);
    const [pendingScroll, setPendingScroll] = useState(false);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const currentRowRef = useRef<HTMLTableRowElement | null>(null);

    const list = lists[league] ?? SIN_DATOS;

    const myIndex = useMemo(
        () => list.findIndex((it) => it.atk === attack && it.def === defense && it.hp === stamina),
        [list, attack, defense, stamina],
    );
    const currentCombo = myIndex >= 0 ? list[myIndex] : null;

    const totalFiltrado = top === 'all' ? list.length : Math.min(Number(top), list.length);

    const visible = useMemo(() => {
        const filtrada = top === 'all' ? list : list.slice(0, Number(top));
        return filtrada.slice(0, renderLimit);
    }, [list, top, renderLimit]);

    // Cambiar de liga o de filtro arranca la lista de nuevo desde la primera tanda.
    useEffect(() => {
        setRenderLimit(CHUNK);
        scrollRef.current?.scrollTo({ top: 0 });
    }, [league, top]);

    // El salto a la fila propia espera a que esa fila esté montada: si estaba
    // más allá del límite de render, primero hay que subirlo.
    useEffect(() => {
        if (!pendingScroll) return;
        const contenedor = scrollRef.current;
        const fila = currentRowRef.current;

        if (contenedor && fila) {
            // A mano y no con scrollIntoView, que además arrastra la página
            // entera y deja la tabla fuera de la vista.
            const cajaContenedor = contenedor.getBoundingClientRect();
            const cajaFila = fila.getBoundingClientRect();
            contenedor.scrollTo({
                top:
                    contenedor.scrollTop +
                    (cajaFila.top - cajaContenedor.top) -
                    contenedor.clientHeight / 2 +
                    cajaFila.height / 2,
                // Sin animación: un salto suave de cien mil píxeles se queda a
                // medio camino cuando la lista acaba de crecer.
                behavior: 'auto',
            });
            setPendingScroll(false);
        } else if (myIndex >= 0 && renderLimit <= myIndex) {
            setRenderLimit(myIndex + 25);
        } else {
            setPendingScroll(false);
        }
    }, [pendingScroll, renderLimit, myIndex]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 400) {
            setRenderLimit((limite) => (limite >= totalFiltrado ? limite : limite + CHUNK));
        }
    };

    const irAMiIv = () => {
        if (myIndex < 0) return;
        // Con un top corto la fila propia no entra en la lista filtrada, así que
        // se levanta el filtro en vez de dejar el botón sin efecto.
        if (top !== 'all' && myIndex >= Number(top)) setTop('all');
        setPendingScroll(true);
    };

    return (
        <section className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 ${className}`}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div className="flex items-baseline gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Ranking de IVs
                    </h3>
                    <span className="hidden text-[11px] tabular-nums text-slate-500 sm:inline">
                        {totalFiltrado.toLocaleString('es-CL')} de {list.length.toLocaleString('es-CL')} combinaciones
                    </span>
                </div>

                <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
                    {LEAGUES.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setLeague(id)}
                            aria-pressed={league === id}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${league === id
                                ? 'bg-amber-400 text-slate-950'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <img src={icon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/70 p-0.5">
                    {TOP_OPTIONS.map((option) => (
                        <button
                            key={String(option)}
                            type="button"
                            onClick={() => setTop(option)}
                            aria-pressed={top === option}
                            className={`cursor-pointer rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${top === option
                                ? 'bg-slate-200 text-slate-900'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            {option === 'all' ? 'Todas' : `Top ${option}`}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={irAMiIv}
                    disabled={myIndex < 0}
                    className="cursor-pointer rounded-lg border border-amber-400/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300 transition hover:bg-amber-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
                    title="Saltar a la combinación seleccionada"
                >
                    {myIndex >= 0 ? `Mi IV · #${(myIndex + 1).toLocaleString('es-CL')}` : 'Sin posición'}
                </button>
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-[62vh] overflow-auto border-t border-slate-800"
            >
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-950 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            <th className="border-b border-slate-800 py-2.5 pl-4 pr-3 font-medium">Rango</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 font-medium">IV</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 text-right font-medium">Sum</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 text-right font-medium">Producto</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 font-medium">%</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 text-right font-medium">PC</th>
                            <th className="border-b border-slate-800 px-3 py-2.5 text-right font-medium">Nivel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentCombo && (
                            <tr className="border-b-2 border-amber-400/50 bg-amber-400/15">
                                <td className="py-2 pl-4 pr-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                                            Actual
                                        </span>
                                        <span className="font-mono text-xs font-bold tabular-nums text-amber-200/80">
                                            #{(myIndex + 1).toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 font-mono text-[15px] font-bold text-amber-100">
                                    {currentCombo.atk}/{currentCombo.def}/{currentCombo.hp}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-100/80">
                                    {currentCombo.sum}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-xs font-semibold tabular-nums text-amber-100/80">
                                    {Math.round(Number(currentCombo.statProduct ?? 0)).toLocaleString('es-CL')}
                                </td>
                                <td className="px-3 py-2">
                                    <span className="font-mono text-xs font-bold tabular-nums text-amber-100">
                                        {Number(currentCombo.pct ?? 0).toFixed(2)}%
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-amber-100/80">
                                    {currentCombo.cp}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-100/80">
                                    {currentCombo.bestLevel}
                                </td>
                            </tr>
                        )}

                        {visible.map((it, idx) => {
                            const isCurrent = it.atk === attack && it.def === defense && it.hp === stamina;
                            const pct = Number(it.pct ?? 0);
                            return (
                                <tr
                                    key={`${it.atk}-${it.def}-${it.hp}`}
                                    ref={isCurrent ? currentRowRef : undefined}
                                    className={`border-b border-slate-800/60 transition-colors ${isCurrent
                                        ? 'bg-amber-400/10 ring-1 ring-inset ring-amber-400/40'
                                        : 'odd:bg-slate-900/40 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <td className="py-2 pl-4 pr-3">
                                        <span
                                            className={`font-mono text-base font-black tabular-nums ${rankTextClass(idx + 1, isCurrent)}`}
                                        >
                                            #{idx + 1}
                                        </span>
                                    </td>
                                    <td className={`px-3 py-2 font-mono text-[15px] font-semibold ${isCurrent ? 'text-amber-200' : 'text-slate-100'}`}>
                                        {it.atk}/{it.def}/{it.hp}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{it.sum}</td>
                                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-slate-400">
                                        {Math.round(Number(it.statProduct ?? 0)).toLocaleString('es-CL')}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-slate-300">
                                                {pct.toFixed(2)}%
                                            </span>
                                            <span className="h-1 w-full min-w-8 max-w-24 overflow-hidden rounded-full bg-slate-800">
                                                <span
                                                    className={`block h-full rounded-full ${isCurrent ? 'bg-amber-400' : 'bg-slate-600'}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                                                />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">{it.cp}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">{it.bestLevel}</td>
                                </tr>
                            );
                        })}

                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500">
                                    Todavía no hay ranking para esta liga.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
