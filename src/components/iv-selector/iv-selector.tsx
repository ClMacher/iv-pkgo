import { useRef, useState } from 'react';

export type IvInputMode = 'buttons' | 'slider' | 'manual';

interface IvSelectorProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    mode: IvInputMode;
    /** Color del nombre de la estadística. */
    labelClass: string;
    /** Casilla del valor elegido. */
    selectedClass: string;
    /** Casillas del 0 al valor elegido: la estela que da la escala. */
    trailClass: string;
    sliderClass: string;
}

const MAX_IV = 15;
const VALUES = Array.from({ length: MAX_IV + 1 }, (_, iv) => iv);

/**
 * Selector de una estadística individual (0-15).
 *
 * Las casillas hasta el valor elegido van teñidas: dieciséis botones idénticos
 * con uno pintado no dejan ver que esto es una escala, y con la estela el nivel
 * se lee de un vistazo sin buscar cuál está marcado. Al pasar el ratón la
 * estela se estira o se encoge hasta donde apunta el cursor, así se ve el
 * cambio antes de confirmarlo.
 *
 * El grupo es un `radiogroup` con tabulador móvil: una sola parada de teclado
 * para las dieciséis casillas —eran cuarenta y ocho en la calculadora entera— y
 * las flechas mueven el valor.
 */
export default function IvSelector({
    label,
    value,
    onChange,
    mode,
    labelClass,
    selectedClass,
    trailClass,
    sliderClass,
}: IvSelectorProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const groupRef = useRef<HTMLDivElement | null>(null);

    // Con el ratón encima manda el cursor; si no, el valor real.
    const fillUpTo = hovered ?? value;

    const focusValue = (next: number) => {
        onChange(next);
        groupRef.current
            ?.querySelector<HTMLButtonElement>(`button[data-iv="${next}"]`)
            ?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const saltos: Record<string, number> = {
            ArrowRight: value + 1,
            ArrowUp: value + 1,
            ArrowLeft: value - 1,
            ArrowDown: value - 1,
            Home: 0,
            End: MAX_IV,
        };

        const destino = saltos[event.key];
        if (destino === undefined) return;

        event.preventDefault();
        focusValue(Math.min(MAX_IV, Math.max(0, destino)));
    };

    const campoNumerico = (
        <input
            type="number"
            min="0"
            max={MAX_IV}
            step="1"
            value={value}
            onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isInteger(nextValue) && nextValue >= 0 && nextValue <= MAX_IV) {
                    onChange(nextValue);
                }
            }}
            className="w-16 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-right font-mono text-xs text-white outline-none focus:border-amber-400"
            aria-label={`IV de ${label}`}
        />
    );

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Ancho fijo para que las tres filas arranquen alineadas. */}
            <span
                className={`text-xs font-bold uppercase tracking-wider sm:w-[68px] sm:shrink-0 ${labelClass}`}
            >
                {label}
            </span>

            {mode === 'buttons' && (
                <div
                    ref={groupRef}
                    role="radiogroup"
                    aria-label={`IV de ${label}`}
                    onKeyDown={handleKeyDown}
                    onMouseLeave={() => setHovered(null)}
                    className="grid flex-1 grid-cols-8 gap-1 sm:grid-cols-16 sm:gap-[3px]"
                >
                    {VALUES.map((iv) => {
                        const esElegido = iv === value;
                        const enEstela = iv <= fillUpTo;

                        return (
                            <button
                                key={iv}
                                type="button"
                                data-iv={iv}
                                role="radio"
                                aria-checked={esElegido}
                                // Tabulador móvil: solo la casilla activa entra en el recorrido.
                                tabIndex={esElegido ? 0 : -1}
                                onClick={() => onChange(iv)}
                                onMouseEnter={() => setHovered(iv)}
                                onFocus={() => setHovered(iv)}
                                onBlur={() => setHovered(null)}
                                className={`flex h-10 cursor-pointer items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${esElegido
                                    ? selectedClass
                                    : enEstela
                                        ? trailClass
                                        : 'bg-slate-800/70 text-slate-500 hover:bg-slate-700 hover:text-slate-100'
                                    }`}
                                aria-label={`${label}: ${iv}`}
                            >
                                {iv}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* El deslizador no enseña el número, así que ahí el campo sí hace falta;
                con las casillas el valor ya se ve encendido y sólo estorbaba. */}
            {mode === 'slider' && (
                <div className="flex flex-1 items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max={MAX_IV}
                        value={value}
                        onChange={(event) => onChange(Number(event.target.value))}
                        className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 ${sliderClass}`}
                        aria-label={`IV de ${label}`}
                    />
                    {campoNumerico}
                </div>
            )}

            {mode === 'manual' && campoNumerico}
        </div>
    );
}
