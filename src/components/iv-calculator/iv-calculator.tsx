import { useEffect, useMemo, useState } from 'react';
import { fetchCpMultipliers, fetchPrecomputedRanking } from '../../services/poke-api';
import IvRanking from '../iv-ranking/iv-ranking';
import type { League, RankedCombo } from '../iv-ranking/iv-ranking';
import IvSelector from '../iv-selector/iv-selector';
import type { IvInputMode } from '../iv-selector/iv-selector';

export interface IvValues {
    attack: number;
    defense: number;
    stamina: number;
    level: number;
}

interface IvCalculatorProps {
    baseStats?: { atk: number; def: number; hp: number };
    pokemon?: { dex: number; speciesName: string; speciesId: string } | null;
    ivValues: IvValues;
    onIvValuesChange: (values: IvValues) => void;
    onPinAnalysis?: () => void;
}

// Valores sincronizados con https://pogoapi.net/api/v1/cp_multiplier.json
const CPM_TABLE: Record<number, number> = {
    1: 0.09399999678134918,
    1.5: 0.1351374313235283,
    2: 0.16639786958694458,
    2.5: 0.1926509141921997,
    3: 0.21573247015476227,
    3.5: 0.23657265305519104,
    4: 0.2557200491428375,
    4.5: 0.27353037893772125,
    5: 0.29024988412857056,
    5.5: 0.3060573786497116,
    6: 0.3210875988006592,
    6.5: 0.33544503152370453,
    7: 0.3492126762866974,
    7.5: 0.362457737326622,
    8: 0.37523558735847473,
    8.5: 0.38759241108516856,
    9: 0.39956727623939514,
    9.5: 0.4111935495172506,
    10: 0.4225000143051148,
    10.5: 0.4329264134104144,
    11: 0.443107545375824,
    11.5: 0.4530599538719858,
    12: 0.46279838681221,
    12.5: 0.4723360780626535,
    13: 0.4816849529743195,
    13.5: 0.4908558102324605,
    14: 0.4998584389686584,
    14.5: 0.5087017565965652,
    15: 0.517393946647644,
    15.5: 0.5259425118565559,
    16: 0.5343543291091919,
    16.5: 0.5426357612013817,
    17: 0.5507926940917969,
    17.5: 0.5588305993005633,
    18: 0.5667545199394226,
    18.5: 0.574569147080183,
    19: 0.5822789072990417,
    19.5: 0.5898879119195044,
    20: 0.5974000096321106,
    20.5: 0.6048236563801765,
    21: 0.6121572852134705,
    21.5: 0.6194041110575199,
    22: 0.6265671253204346,
    22.5: 0.633649181574583,
    23: 0.6406529545783997,
    23.5: 0.6475809663534164,
    24: 0.654435634613037,
    24.5: 0.6612192690372467,
    25: 0.667934000492096,
    25.5: 0.6745819002389908,
    26: 0.6811649203300476,
    26.5: 0.6876849085092545,
    27: 0.6941436529159546,
    27.5: 0.7005428969860077,
    28: 0.7068842053413391,
    28.5: 0.7131690979003906,
    29: 0.719399094581604,
    29.5: 0.7255756109952927,
    30: 0.7317000031471252,
    30.5: 0.7347410172224045,
    31: 0.7377694845199585,
    31.5: 0.740785576403141,
    32: 0.7437894344329834,
    32.5: 0.7467812150716782,
    33: 0.7497610449790955,
    33.5: 0.7527291029691696,
    34: 0.7556855082511902,
    34.5: 0.7586303651332855,
    35: 0.7615638375282288,
    35.5: 0.7644860669970512,
    36: 0.7673971652984619,
    36.5: 0.7702972739934921,
    37: 0.7731865048408508,
    37.5: 0.7760649472475052,
    38: 0.7789327502250671,
    38.5: 0.78179006,
    39: 0.78463697,
    39.5: 0.78747358,
    40: 0.79030001,
    40.5: 0.79280001,
    41: 0.79530001,
    41.5: 0.79780001,
    42: 0.8003,
    42.5: 0.8028,
    43: 0.8053,
    43.5: 0.8078,
    44: 0.81029999,
    44.5: 0.81279999,
    45: 0.81529999,
    45.5: 0.81779999,
    46: 0.82029999,
    46.5: 0.82279999,
    47: 0.82529999,
    47.5: 0.82779999,
    48: 0.83029999,
    48.5: 0.83279999,
    49: 0.83529999,
    49.5: 0.83779999,
    50: 0.84029999
};

const EMPTY_RANKINGS: Record<League, RankedCombo[]> = { great: [], ultra: [], master: [] };

const LEAGUE_DEFS = [
    { id: 'great' as League, label: 'Great', icon: '/assets/leagues/pogo_great_league.webp', cap: 1500 },
    { id: 'ultra' as League, label: 'Ultra', icon: '/assets/leagues/pogo_ultra_league.webp', cap: 2500 },
    { id: 'master' as League, label: 'Master', icon: '/assets/leagues/pogo_master_league.webp', cap: null },
];

/**
 * Fórmula canónica de PC, la misma que usa PvPoke:
 * floor(atk * sqrt(def) * sqrt(hp) * cpm² / 10), con un suelo de 10.
 */
function computeCpWithCpm(
    baseAtk: number,
    baseDef: number,
    baseHp: number,
    atkIv: number,
    defIv: number,
    hpIv: number,
    cpm: number,
) {
    const cp = Math.floor(
        ((baseAtk + atkIv) * Math.sqrt(baseDef + defIv) * Math.sqrt(baseHp + hpIv) * cpm ** 2) / 10,
    );
    return Math.max(10, cp);
}

/**
 * Normaliza el ranking que devuelve el servicio, que llega en tres formatos
 * según de dónde salga: `all` en los archivos precalculados, `top` en los que
 * se generan al vuelo y `map` en los del esquema viejo, que hay que reordenar
 * por posición porque un objeto no garantiza el orden de sus claves.
 *
 * Sale ordenado por posición, así que el índice de la lista ES la posición y no
 * hace falta arrastrar el `map` en paralelo para consultarla.
 */
function parseFullRanking(data: any): RankedCombo[] {
    const source = Array.isArray(data?.all) ? data.all : Array.isArray(data?.top) ? data.top : null;

    if (source) {
        return source.map((it: any) => ({
            atk: Number(it.atk),
            def: Number(it.def),
            hp: Number(it.hp),
            cp: Number(it.cp),
            sum: Number(it.sum),
            bestLevel: Number(it.lvl ?? it.bestLevel ?? 0),
            statProduct: Number(it.statProduct ?? it.product ?? 0),
            pct: Number(it.pct ?? 0),
        }));
    }

    if (!data?.map || typeof data.map !== 'object') return [];

    return Object.entries(data.map)
        .map(([key, value]: [string, any]) => {
            const [atk, def, hp] = key.split('-').map(Number);
            return {
                rank: Number(value?.rank ?? 0),
                atk,
                def,
                hp,
                cp: Number(value?.cp ?? 0),
                sum: atk + def + hp,
                bestLevel: Number(value?.lvl ?? value?.bestLevel ?? 0),
                statProduct: Number(value?.statProduct ?? value?.product ?? 0),
                pct: Number(value?.pct ?? 0),
            };
        })
        .sort((a, b) => a.rank - b.rank)
        .map(({ rank: _rank, ...combo }) => combo);
}

export default function IvCalculator({ baseStats, pokemon, ivValues, onIvValuesChange, onPinAnalysis }: IvCalculatorProps) {
    const { attack, defense, stamina, level } = ivValues;
    const setAttack = (value: number) => onIvValuesChange({ ...ivValues, attack: value });
    const setDefense = (value: number) => onIvValuesChange({ ...ivValues, defense: value });
    const setStamina = (value: number) => onIvValuesChange({ ...ivValues, stamina: value });
    const setLevel = (value: number) => onIvValuesChange({ ...ivValues, level: value });

    const [ivInputMode, setIvInputMode] = useState<IvInputMode>('buttons');
    const [cp, setCp] = useState<number>(0);
    const [cpMultipliers, setCpMultipliers] = useState<Record<number, number> | null>(null);
    const [rankingLists, setRankingLists] = useState<Record<League, RankedCombo[]>>(EMPTY_RANKINGS);

    /** Mejor PC alcanzable sin pasarse del tope de cada liga. */
    const [bestCpByLeague, setBestCpByLeague] = useState<Record<League, number>>({ great: 0, ultra: 0, master: 0 });

    const totalIv = attack + defense + stamina;
    const percentage = ((totalIv / 45) * 100).toFixed(1);

    // App rehace `baseStats` en cada render, así que los efectos dependen de los
    // tres números y no de la referencia: con el objeto en las dependencias el
    // ranking se volvía a pedir y a parsear en cada pulsación.
    const baseAtk = baseStats?.atk;
    const baseDef = baseStats?.def;
    const baseHp = baseStats?.hp;
    const speciesId = pokemon?.speciesId;

    // Cargar los CPM exactos de pogoapi.net una sola vez.
    useEffect(() => {
        let mounted = true;
        fetchCpMultipliers()
            .then((map) => {
                if (mounted && map && Object.keys(map).length > 0) setCpMultipliers(map);
            })
            .catch(() => { });
        return () => {
            mounted = false;
        };
    }, []);

    // El ranking depende de la especie, no de los IV elegidos: se pide una vez
    // por Pokémon y la posición actual se busca después sobre la lista ya cargada.
    useEffect(() => {
        if (!speciesId || baseAtk === undefined) {
            setRankingLists(EMPTY_RANKINGS);
            return;
        }

        let cancelado = false;

        (async () => {
            try {
                const requestedTop = 4096;
                const [great, ultra, master] = await Promise.all([
                    fetchPrecomputedRanking(speciesId, 1500, { top: requestedTop }),
                    fetchPrecomputedRanking(speciesId, 2500, { top: requestedTop }),
                    fetchPrecomputedRanking(speciesId, 'master', { top: requestedTop }),
                ]);

                // Cambiar de Pokémon mientras se descarga no debe pisar la lista
                // nueva con la que venía en camino.
                if (cancelado) return;

                setRankingLists({
                    great: parseFullRanking(great),
                    ultra: parseFullRanking(ultra),
                    master: parseFullRanking(master),
                });
            } catch (e) {
                console.warn('No se pudo cargar el ranking precalculado', e);
                if (!cancelado) setRankingLists(EMPTY_RANKINGS);
            }
        })();

        return () => {
            cancelado = true;
        };
    }, [speciesId, baseAtk, baseDef, baseHp]);

    // PC del nivel elegido y mejor PC por liga.
    useEffect(() => {
        if (baseAtk === undefined || baseDef === undefined || baseHp === undefined) {
            setCp(0);
            setBestCpByLeague({ great: 0, ultra: 0, master: 0 });
            return;
        }

        // Definido dentro del efecto y no fuera: así la única dependencia real
        // es `cpMultipliers`, que ya está en la lista.
        const cpmDe = (lvl: number) => cpMultipliers?.[lvl] ?? CPM_TABLE[lvl] ?? 0.79030001;

        setCp(computeCpWithCpm(baseAtk, baseDef, baseHp, attack, defense, stamina, cpmDe(level)));

        const levels = Object.keys(cpMultipliers ?? CPM_TABLE)
            .map(Number)
            .sort((a, b) => a - b);

        const mejores = { great: 0, ultra: 0, master: 0 };
        levels.forEach((lvl) => {
            const simCpm = cpmDe(lvl);
            if (!simCpm) return;
            const simCp = computeCpWithCpm(baseAtk, baseDef, baseHp, attack, defense, stamina, simCpm);
            if (simCp <= 1500 && simCp > mejores.great) mejores.great = simCp;
            if (simCp <= 2500 && simCp > mejores.ultra) mejores.ultra = simCp;
            if (simCp > mejores.master) mejores.master = simCp;
        });

        setBestCpByLeague(mejores);
    }, [attack, defense, stamina, level, baseAtk, baseDef, baseHp, cpMultipliers]);

    const leagueCards = useMemo(
        () =>
            LEAGUE_DEFS.map((liga) => {
                const lista = rankingLists[liga.id];
                // La lista viene ordenada por posición, así que el índice basta.
                const idx = lista.findIndex(
                    (it) => it.atk === attack && it.def === defense && it.hp === stamina,
                );
                return {
                    ...liga,
                    rank: idx >= 0 ? idx + 1 : null,
                    total: lista.length,
                    bestCp: bestCpByLeague[liga.id],
                    exceedsLimit: liga.cap !== null && cp > liga.cap,
                };
            }),
        [rankingLists, bestCpByLeague, cp, attack, defense, stamina],
    );

    const getRankCardStyle = (rank: number | null, exceedsLimit: boolean) => {
        if (exceedsLimit) return 'border-red-400/60 bg-red-950/40';
        if (rank === 1) return 'border-amber-300/70 bg-amber-950/40';
        if (rank !== null && rank <= 10) return 'border-emerald-400/60 bg-emerald-950/30';
        if (rank !== null && rank <= 200) return 'border-blue-400/60 bg-blue-950/30';
        return 'border-slate-800 bg-slate-950/50';
    };

    const ivControls = [
        {
            label: 'Ataque',
            value: attack,
            setValue: setAttack,
            labelClass: 'text-red-400',
            selectedClass: 'bg-red-500 text-white shadow-md shadow-red-500/30',
            trailClass: 'bg-red-500/25 text-red-100',
            sliderClass: 'accent-red-500',
        },
        {
            label: 'Defensa',
            value: defense,
            setValue: setDefense,
            labelClass: 'text-blue-400',
            selectedClass: 'bg-blue-500 text-white shadow-md shadow-blue-500/30',
            trailClass: 'bg-blue-500/25 text-blue-100',
            sliderClass: 'accent-blue-500',
        },
        {
            label: 'Salud',
            value: stamina,
            setValue: setStamina,
            labelClass: 'text-green-400',
            selectedClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
            trailClass: 'bg-emerald-500/25 text-emerald-100',
            sliderClass: 'accent-green-500',
        },
    ] as const;

    return (
        <>
            <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
                <header className="flex items-center justify-between gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                        Calculadora de IVs y PC
                    </h2>
                    {onPinAnalysis && baseStats && (
                        <button
                            type="button"
                            onClick={onPinAnalysis}
                            className="cursor-pointer rounded-lg border border-amber-400/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300 transition hover:bg-amber-400 hover:text-slate-950"
                            title="Guardar esta combinación en los análisis fijados"
                        >
                            <span aria-hidden="true">📌</span> Fijar
                        </button>
                    )}
                </header>

                {/* El resultado va arriba y a lo ancho de la tarjeta: es lo que se
                    mira después de cada ajuste, y así el selector de IV se queda
                    con la fila entera en vez de media columna. */}
                <div className="flex flex-col gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Evaluación actual
                    </p>

                    {/* Sin especie no hay stats base que combinar con los IV, así que
                        las tarjetas saldrían todas con un guion. */}
                    {!baseStats && (
                        <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-800 px-6 py-6 text-center">
                            <p className="text-sm font-semibold text-slate-400">Ningún Pokémon elegido</p>
                            <p className="max-w-md text-xs leading-relaxed text-slate-600">
                                Búscalo por nombre o por número de Pokédex y aquí aparecerá su posición
                                en cada liga.
                            </p>
                        </div>
                    )}

                    {baseStats && (
                        <>
                            <div className="flex flex-wrap items-stretch gap-3">
                                <div className="grid min-w-60 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        { label: 'IV', value: `${attack}/${defense}/${stamina}`, className: 'text-slate-100' },
                                        { label: '% total', value: `${percentage}%`, className: totalIv === 45 ? 'text-amber-300' : 'text-slate-100' },
                                        { label: 'PC', value: cp > 10 ? String(cp) : '—', className: 'text-slate-100' },
                                        { label: 'Nivel', value: String(level), className: 'text-amber-300' },
                                    ].map(({ label, value, className }) => (
                                        <div
                                            key={label}
                                            className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/50 px-2 py-3 text-center"
                                        >
                                            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                                            <p className={`mt-1 font-mono text-base font-bold tabular-nums ${className}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Una tarjeta por liga: posición del IV actual y el mejor PC
                                    que alcanza sin pasarse del tope. */}
                                <div className="grid min-w-72 flex-[1.25] grid-cols-3 gap-2">
                                    {leagueCards.map(({ id, label, icon, rank, total, bestCp, exceedsLimit, cap }) => (
                                        <div
                                            key={id}
                                            className={`rounded-xl border px-2 py-3 text-center ${getRankCardStyle(rank, exceedsLimit)}`}
                                            title={
                                                exceedsLimit
                                                    ? `Con este nivel supera el tope de ${cap} PC de la liga ${label}`
                                                    : `Liga ${label}`
                                            }
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <img src={icon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                                                    {label}
                                                </span>
                                            </div>
                                            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-slate-100">
                                                {rank ? `#${rank.toLocaleString('es-CL')}` : '—'}
                                            </p>
                                            <p className="text-[11px] tabular-nums text-slate-500">
                                                de {total ? total.toLocaleString('es-CL') : '—'}
                                            </p>
                                            <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 border-t border-white/5 pt-1.5 text-[11px] tabular-nums text-slate-400">
                                                <span className="whitespace-nowrap">
                                                    {bestCp > 10 ? `máx ${bestCp} PC` : '—'}
                                                </span>
                                                {exceedsLimit && (
                                                    <span className="whitespace-nowrap font-bold uppercase tracking-wide text-red-300">
                                                        Excede PC
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[10px] leading-relaxed text-slate-600">
                                La posición ordena las 4096 combinaciones por producto de estadísticas al mejor
                                nivel de cada liga. «Máx PC» es el tope que alcanza este IV sin pasarse del límite.
                            </p>
                        </>
                    )}
                </div>

                {/* Etiqueta, valor y barra en una sola línea: a lo ancho de la tarjeta
                    el bloque de antes dejaba media fila vacía debajo del deslizador. */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
                            Nivel del Pokémon
                        </span>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            step="1"
                            value={level}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                if (Number.isInteger(nextValue) && nextValue >= 1 && nextValue <= 50) {
                                    setLevel(nextValue);
                                }
                            }}
                            className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-right font-mono text-sm text-white outline-none focus:border-amber-400"
                            aria-label="Nivel del Pokémon"
                        />
                        <input
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={level}
                            onChange={(e) => setLevel(Number(e.target.value))}
                            className="h-2 min-w-40 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Selector de IV
                        </span>
                        <select
                            value={ivInputMode}
                            onChange={(event) => setIvInputMode(event.target.value as typeof ivInputMode)}
                            className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                            aria-label="Tipo de selector de IV"
                        >
                            <option value="buttons">Selección directa</option>
                            <option value="slider">Deslizador</option>
                            <option value="manual">Ingresar manualmente</option>
                        </select>
                    </div>

                    {ivControls.map((control) => (
                        <IvSelector
                            key={control.label}
                            label={control.label}
                            value={control.value}
                            onChange={control.setValue}
                            mode={ivInputMode}
                            labelClass={control.labelClass}
                            selectedClass={control.selectedClass}
                            trailClass={control.trailClass}
                            sliderClass={control.sliderClass}
                        />
                    ))}
                </div>
            </section>

            {baseStats && (
                <IvRanking
                    lists={rankingLists}
                    attack={attack}
                    defense={defense}
                    stamina={stamina}
                    className="lg:col-span-2"
                />
            )}
        </>
    );
}
