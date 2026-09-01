import { useState, useEffect } from 'react';
import { fetchCpMultipliers, fetchPrecomputedRanking } from '../../services/poke-api';

interface IvCalculatorProps {
    baseStats?: { atk: number; def: number; hp: number };
    pokemon?: { dex: number; speciesName: string; speciesId: string } | null;
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

export default function IvCalculator({ baseStats, pokemon }: IvCalculatorProps) {
    const [attack, setAttack] = useState<number>(15);
    const [defense, setDefense] = useState<number>(15);
    const [stamina, setStamina] = useState<number>(15);
    const [level, setLevel] = useState<number>(20);
    const [cp, setCp] = useState<number>(0);
    const [cpMultipliers, setCpMultipliers] = useState<Record<number, number> | null>(null);

    // Estados para simulación PvP
    const [greatLeagueCp, setGreatLeagueCp] = useState<number>(0);
    const [ultraLeagueCp, setUltraLeagueCp] = useState<number>(0);

    const totalIv = attack + defense + stamina;
    const percentage = ((totalIv / 45) * 100).toFixed(1);

    // Helper: obtener CPM local (prefiere valores cargados desde pogoapi)
    const getCpmLocal = (lvl: number) => {
        if (cpMultipliers && cpMultipliers[lvl]) return cpMultipliers[lvl];
        return CPM_TABLE[lvl] || 0.79030001;
    };

    // Fórmula canónica usada por muchas referencias (PvPoke):
    // CP = floor(((baseAtk+atkIv) * sqrt(baseDef+defIv) * sqrt(baseHp+hpIv) * (cpm ** 2)) / 10)
    const computeCpWithCpm = (baseAtk: number, baseDef: number, baseHp: number, atkIv: number, defIv: number, hpIv: number, cpm: number) => {
        const atk = baseAtk + atkIv;
        const def = baseDef + defIv;
        const hp = baseHp + hpIv;
        const cp = Math.floor((atk * Math.sqrt(def) * Math.sqrt(hp) * (cpm ** 2)) / 10);
        return Math.max(10, cp);
    };

    type RankedCombo = {
        atk: number;
        def: number;
        hp: number;
        cp: number;
        sum: number;
        bestLevel: number;
        statProduct: number;
        pct: number;
    };

    // Calcular ranking de todos los IVs (0-15) para el nivel y pokemon actuales
    const [topGreatIvs, setTopGreatIvs] = useState<RankedCombo[]>([]);
    const [topUltraIvs, setTopUltraIvs] = useState<RankedCombo[]>([]);
    const [topMasterIvs, setTopMasterIvs] = useState<RankedCombo[]>([]);
    const [currentRankGreat, setCurrentRankGreat] = useState<number | null>(null);
    const [currentRankUltra, setCurrentRankUltra] = useState<number | null>(null);
    const [currentRankMaster, setCurrentRankMaster] = useState<number | null>(null);
    const [suggestedLevel, setSuggestedLevel] = useState<number | null>(null);
    const [suggestedCp, setSuggestedCp] = useState<number | null>(null);
    const [totalGreat, setTotalGreat] = useState<number>(0);
    const [totalUltra, setTotalUltra] = useState<number>(0);
    const [totalMaster, setTotalMaster] = useState<number>(0);
    const [selectedLeague, setSelectedLeague] = useState<'great' | 'ultra' | 'master'>('great');
    const [selectedTop, setSelectedTop] = useState<number | 'all'>(50);
    const rankingOptions: Array<number | 'all'> = [10, 50, 100, 500, 'all'];

    const getVisibleRankingSlice = (list: RankedCombo[]) => {
        if (selectedTop === 'all') return list;
        const limit = Math.min(Number(selectedTop), list.length);
        return list.slice(0, limit);
    };

    useEffect(() => {
        if (!baseStats) {
            setTopGreatIvs([]);
            setTopUltraIvs([]);
            setTopMasterIvs([]);
            setCurrentRankGreat(null);
            setCurrentRankUltra(null);
            setCurrentRankMaster(null);
            setSuggestedLevel(null);
            setSuggestedCp(null);
            return;
        }

        const applyPrecomputedRanking = async () => {
            if (!pokemon || !pokemon.speciesId) {
                return;
            }

            const requestedTop = 4096;

            try {
                const [greatRanking, ultraRanking, masterRanking] = await Promise.all([
                    fetchPrecomputedRanking(pokemon.speciesId, 1500, { top: requestedTop }),
                    fetchPrecomputedRanking(pokemon.speciesId, 2500, { top: requestedTop }),
                    fetchPrecomputedRanking(pokemon.speciesId, 'master', { top: requestedTop }),
                ]);

                const parseFullRanking = (data: any) => {
                    const source = Array.isArray(data?.all)
                        ? data.all
                        : Array.isArray(data?.top)
                            ? data.top
                            : [];
                    if (Array.isArray(source) && source.length > 0) {
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

                    if (!data?.map || typeof data.map !== 'object') {
                        return [];
                    }

                    return Object.entries(data.map)
                        .map(([key, value]: [string, any]) => {
                            const [atk, def, hp] = key.split('-').map(Number);
                            return {
                                atk,
                                def,
                                hp,
                                cp: Number(value?.cp ?? 0),
                                sum: atk + def + hp,
                                bestLevel: Number(value?.lvl ?? value?.bestLevel ?? 0),
                                statProduct: Number(value?.statProduct ?? value?.product ?? 0),
                                pct: Number(value?.pct ?? 0),
                                rank: Number(value?.rank ?? 0),
                            };
                        })
                        .sort((a, b) => a.rank - b.rank)
                        .map(({ rank, ...it }) => it);
                };

                const greatList = parseFullRanking(greatRanking);
                const ultraList = parseFullRanking(ultraRanking);
                const masterList = parseFullRanking(masterRanking);

                if (greatList.length > 0 || ultraList.length > 0 || masterList.length > 0) {
                    setTopGreatIvs(greatList);
                    setTopUltraIvs(ultraList);
                    setTopMasterIvs(masterList);
                    setTotalGreat(greatRanking?.meta?.total ?? greatList.length);
                    setTotalUltra(ultraRanking?.meta?.total ?? ultraList.length);
                    setTotalMaster(masterRanking?.meta?.total ?? masterList.length);

                    const rankFromMap = (data: any, atk: number, def: number, hp: number) => {
                        const key = `${atk}-${def}-${hp}`;
                        return data?.map?.[key]?.rank ?? null;
                    };

                    setCurrentRankGreat(rankFromMap(greatRanking, attack, defense, stamina));
                    setCurrentRankUltra(rankFromMap(ultraRanking, attack, defense, stamina));
                    setCurrentRankMaster(rankFromMap(masterRanking, attack, defense, stamina));

                    const currentKey = `${attack}-${defense}-${stamina}`;
                    const suggestedGreat = greatRanking?.map?.[currentKey]?.lvl ?? null;
                    const suggestedUltra = ultraRanking?.map?.[currentKey]?.lvl ?? null;
                    const suggestedMaster = masterRanking?.map?.[currentKey]?.lvl ?? null;
                    const suggestedRank = suggestedGreat ?? suggestedUltra ?? suggestedMaster ?? null;
                    const suggestedCpValue =
                        greatRanking?.map?.[currentKey]?.cp ??
                        ultraRanking?.map?.[currentKey]?.cp ??
                        masterRanking?.map?.[currentKey]?.cp ??
                        null;

                    setSuggestedLevel(suggestedRank);
                    setSuggestedCp(suggestedCpValue);
                    return;
                }
            } catch (e) {
                console.warn('Failed to load precomputed ranking, falling back to local ranking', e);
            }

            // Fallback local ranking generation
            const levels = (cpMultipliers ? Object.keys(cpMultipliers).map(Number) : Object.keys(CPM_TABLE).map(Number)).sort((a, b) => a - b);
            const list: RankedCombo[] = [];
            for (let a = 0; a <= 15; a++) {
                for (let d = 0; d <= 15; d++) {
                    for (let s = 0; s <= 15; s++) {
                        let bestCp = 10;
                        let bestLvl = levels[0] ?? 1;
                        let bestStatProduct = 0;
                        for (const lvl of levels) {
                            const simCpm = getCpmLocal(lvl);
                            if (!simCpm) continue;
                            const simCp = computeCpWithCpm(baseStats.atk, baseStats.def, baseStats.hp, a, d, s, simCpm);
                            const statProduct = ((baseStats.atk + a) * simCpm) * ((baseStats.def + d) * simCpm) * Math.floor((baseStats.hp + s) * simCpm);
                            if (simCp > bestCp || (simCp === bestCp && statProduct > bestStatProduct)) {
                                bestCp = simCp;
                                bestLvl = lvl;
                                bestStatProduct = statProduct;
                            }
                        }
                        list.push({
                            atk: a,
                            def: d,
                            hp: s,
                            cp: bestCp,
                            sum: a + d + s,
                            bestLevel: bestLvl,
                            statProduct: bestStatProduct,
                            pct: 100,
                        });
                    }
                }
            }

            list.sort((x, y) => {
                if (y.statProduct !== x.statProduct) return y.statProduct - x.statProduct;
                if (y.cp !== x.cp) return y.cp - x.cp;
                if (y.sum !== x.sum) return y.sum - x.sum;
                if (y.atk !== x.atk) return y.atk - x.atk;
                return y.def - x.def;
            });

            const masterList = list;
            const ultraList = masterList.filter(item => item.cp <= 2500);
            const greatList = masterList.filter(item => item.cp <= 1500);

            setTopMasterIvs(masterList);
            setTopUltraIvs(ultraList);
            setTopGreatIvs(greatList);

            setTotalMaster(masterList.length);
            setTotalUltra(ultraList.length);
            setTotalGreat(greatList.length);

            const masterIdx = masterList.findIndex(item => item.atk === attack && item.def === defense && item.hp === stamina);
            setCurrentRankMaster(masterIdx >= 0 ? masterIdx + 1 : null);

            const ultraIdx = ultraList.findIndex(item => item.atk === attack && item.def === defense && item.hp === stamina);
            setCurrentRankUltra(ultraIdx >= 0 ? ultraIdx + 1 : null);

            const greatIdx = greatList.findIndex(item => item.atk === attack && item.def === defense && item.hp === stamina);
            setCurrentRankGreat(greatIdx >= 0 ? greatIdx + 1 : null);

            if (masterIdx >= 0) {
                const combo = masterList[masterIdx];
                setSuggestedLevel(combo.bestLevel || null);
                setSuggestedCp(combo.cp || null);
            } else {
                setSuggestedLevel(null);
                setSuggestedCp(null);
            }
        };

        applyPrecomputedRanking();
    }, [baseStats, pokemon, level, attack, defense, stamina, cpMultipliers, selectedTop]);

    useEffect(() => {
        if (baseStats) {
            // baseStats y IVs se usan directamente en los cálculos siguientes

            // 1. Calcular PC del nivel manual actual usando la fórmula exacta y el CPM cargado
            const cpm = getCpmLocal(level);
            const calculatedCp = computeCpWithCpm(baseStats.atk, baseStats.def, baseStats.hp, attack, defense, stamina, cpm);
            setCp(calculatedCp);

            // 2. Simulación PvP: Buscar nivel óptimo para Liga Super (Límite 1500) y Ultra (Límite 2500)
            let bestGreatCp = 10;
            let bestUltraCp = 10;

            const levels = (cpMultipliers ? Object.keys(cpMultipliers).map(Number) : Object.keys(CPM_TABLE).map(Number)).sort((a, b) => a - b);
            levels.forEach((lvl) => {
                const simCpm = getCpmLocal(lvl);
                if (!simCpm) return;
                const simCp = computeCpWithCpm(baseStats.atk, baseStats.def, baseStats.hp, attack, defense, stamina, simCpm);

                if (simCp <= 1500 && simCp > bestGreatCp) bestGreatCp = simCp;
                if (simCp <= 2500 && simCp > bestUltraCp) bestUltraCp = simCp;
            });

            setGreatLeagueCp(bestGreatCp);
            setUltraLeagueCp(bestUltraCp);
        } else {
            setCp(0);
            setGreatLeagueCp(0);
            setUltraLeagueCp(0);
        }
    }, [attack, defense, stamina, level, baseStats, cpMultipliers]);

    // Cargar CPM exactos desde pogoapi.net una vez
    useEffect(() => {
        let mounted = true;
        fetchCpMultipliers().then((map) => {
            if (mounted && map && Object.keys(map).length > 0) setCpMultipliers(map);
        }).catch(() => { });
        return () => { mounted = false; };
    }, []);

    // (sin funciones auxiliares no usadas)

    const getIvColor = (pct: number) => {
        if (pct === 100) return 'text-amber-500 font-bold animate-pulse';
        if (pct >= 82.2) return 'text-green-500';
        if (pct >= 64.4) return 'text-blue-500';
        return 'text-gray-400';
    };

    return (
        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl border border-slate-700 space-y-6">
            <h2 className="text-xl font-bold text-center">Calculadora de IVs y PC</h2>



            {/* Selector de Nivel */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-amber-400">Nivel del Pokémon</span>
                    <span className="font-bold font-mono">{level}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
            </div>

            {/* Sliders de IV */}
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-red-400">Ataque </span>
                        <span className="font-bold">{attack}</span>
                    </div>
                    <input
                        type="range" min="0" max="15" value={attack}
                        onChange={(e) => setAttack(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-blue-400">Defensa </span>
                        <span className="font-bold">{defense}</span>
                    </div>
                    <input
                        type="range" min="0" max="15" value={defense}
                        onChange={(e) => setDefense(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-green-400">Salud </span>
                        <span className="font-bold">{stamina}</span>
                    </div>
                    <input
                        type="range" min="0" max="15" value={stamina}
                        onChange={(e) => setStamina(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                </div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Evaluación actual</p>
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                            <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2">
                                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400">IV</p>
                                <p className="mt-1 text-lg font-bold text-slate-100">{attack}/{defense}/{stamina}</p>
                            </div>
                            <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2">
                                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400">% total</p>
                                <p className="mt-1 text-lg font-bold text-slate-100">{percentage}%</p>
                            </div>
                            <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2">
                                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400">CP</p>
                                <p className="mt-1 text-lg font-bold text-amber-300 font-mono">{cp > 0 ? cp : '---'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-left sm:min-w-[320px]">
                        {[
                            { label: 'Great', rank: currentRankGreat, total: totalGreat },
                            { label: 'Ultra', rank: currentRankUltra, total: totalUltra },
                            { label: 'Master', rank: currentRankMaster, total: totalMaster },
                        ].map(({ label, rank, total }) => (
                            <div key={label} className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-center">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
                                <p className="mt-1 text-lg font-black text-slate-100">
                                    {rank ? `#${rank}` : 'N/A'}
                                </p>
                                <p className="text-[10px] text-slate-400">de {total || '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN NUEVA: Viabilidad PvP */}
            {baseStats && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center border-b border-slate-800 pb-2">
                        Estimación de Límites para PvP
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 uppercase">
                                <img src="/assets/leagues/pogo_great_league.webp" alt="Great League" className="h-4 w-4 object-contain" />
                                <span>Great</span>
                            </div>
                            <p className={`text-xl font-bold font-mono ${greatLeagueCp > 1480 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {greatLeagueCp > 10 ? `${greatLeagueCp} PC` : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 uppercase">
                                <img src="/assets/leagues/pogo_ultra_league.webp" alt="Ultra League" className="h-4 w-4 object-contain" />
                                <span>Ultra</span>
                            </div>
                            <p className={`text-xl font-bold font-mono ${ultraLeagueCp > 2470 ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {ultraLeagueCp > 10 ? `${ultraLeagueCp} PC` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla de rankings con posición destacada */}
            {baseStats && (
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 shadow-inner shadow-slate-950/40">
                    <div className="mb-4 flex gap-2 justify-center flex-wrap">
                        <button onClick={() => setSelectedLeague('great')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] ${selectedLeague === 'great' ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                            <img src="/assets/leagues/pogo_great_league.webp" alt="Great League" className="h-4 w-4 object-contain" />
                            <span>Great</span>
                        </button>
                        <button onClick={() => setSelectedLeague('ultra')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] ${selectedLeague === 'ultra' ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                            <img src="/assets/leagues/pogo_ultra_league.webp" alt="Ultra League" className="h-4 w-4 object-contain" />
                            <span>Ultra</span>
                        </button>
                        <button onClick={() => setSelectedLeague('master')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.18em] ${selectedLeague === 'master' ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                            <img src="/assets/leagues/pogo_master_league.webp" alt="Master League" className="h-4 w-4 object-contain" />
                            <span>Master</span>
                        </button>
                    </div>

                    <div className="mb-4 flex gap-2 justify-center flex-wrap">
                        {rankingOptions.map((option) => {
                            const isSelected = selectedTop === option;
                            return (
                                <button
                                    key={String(option)}
                                    onClick={() => setSelectedTop(option)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.14em] ${isSelected ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                                >
                                    {option === 'all' ? 'Todas' : `Top ${option}`}
                                </button>
                            );
                        })}
                    </div>



                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase tracking-[0.18em]">
                                    <th className="px-2 py-2 font-medium">Pos.</th>
                                    <th className="px-2 py-2 font-medium">IV</th>
                                    <th className="px-2 py-2 font-medium">Sum</th>
                                    <th className="px-2 py-2 font-medium">Prod.</th>
                                    <th className="px-2 py-2 font-medium">%</th>
                                    <th className="px-2 py-2 font-medium">CP</th>
                                    <th className="px-2 py-2 font-medium">Lvl</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getVisibleRankingSlice(selectedLeague === 'great' ? topGreatIvs : selectedLeague === 'ultra' ? topUltraIvs : topMasterIvs).map((it, idx) => {
                                    const isCurrent = it.atk === attack && it.def === defense && it.hp === stamina;
                                    const isTopTier = idx < 10;
                                    return (
                                        <tr key={`${selectedLeague}-${it.atk}-${it.def}-${it.hp}`} className={`${isCurrent ? 'bg-amber-600/20' : 'bg-slate-800/70'} border-b border-slate-700`}>
                                            <td className="px-2 py-2 w-12">
                                                <span className={`inline-flex min-w-9 justify-center rounded-full border px-1.5 py-1 text-[11px] font-black ${isCurrent ? 'border-amber-300/80 bg-amber-500/10 text-amber-200 ring-1 ring-amber-300/60' : 'border-slate-600 bg-slate-700 text-slate-200'} ${isTopTier ? '' : ''}`}>
                                                    #{idx + 1}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 font-medium text-slate-100">{it.atk}/{it.def}/{it.hp}</td>
                                            <td className="px-2 py-2 text-slate-400">{it.sum}</td>
                                            <td className="px-2 py-2 font-mono text-slate-300">{Number(it.statProduct ?? 0).toLocaleString()}</td>
                                            <td className="px-2 py-2 font-mono text-slate-300">{(Number(it.pct ?? 0)).toFixed(2)}%</td>
                                            <td className="px-2 py-2 font-mono text-slate-400">{it.cp}</td>
                                            <td className="px-2 py-2 text-slate-300">{it.bestLevel}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
