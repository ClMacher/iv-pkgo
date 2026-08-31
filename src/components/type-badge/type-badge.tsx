/**
 * Colores de tipo, en la gama que usan PvPoke y los recursos de la comunidad.
 */
const TYPE_COLORS: Record<string, string> = {
    bug: '#92bc2c',
    dark: '#7a7a8c',
    dragon: '#4d8fe0',
    electric: '#f2d94e',
    fairy: '#ee90e6',
    fighting: '#d3425f',
    fire: '#fba54c',
    flying: '#a1bbec',
    ghost: '#8f7fd4',
    grass: '#5fbd58',
    ground: '#da7c4d',
    ice: '#75d0c1',
    normal: '#a0a29f',
    poison: '#b763cf',
    psychic: '#fa8581',
    rock: '#c9bb8a',
    steel: '#5a8ea2',
    water: '#539ddf',
};


/**
 * Etiqueta de tipo. El color va tintado en vez de sólido porque sobre el fondo
 * oscuro los tipos claros —eléctrico, hielo, roca— dejarían el texto ilegible,
 * y así se conserva el tono reconocible sin pelearse con el contraste.
 */
export default function TypeBadge({ type }: { type: string }) {
    const color = TYPE_COLORS[type] ?? TYPE_COLORS.normal;

    return (
        <span
            className="px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wide leading-4"
            style={{
                color,
                backgroundColor: `${color}26`,
                border: `1px solid ${color}59`,
            }}
        >
            {type}
        </span>
    );
}
