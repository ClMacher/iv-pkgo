import { typeColor } from '../../services/type-colors';

/**
 * Etiqueta de tipo. El color va tintado en vez de sólido porque sobre el fondo
 * oscuro los tipos claros —eléctrico, hielo, roca— dejarían el texto ilegible,
 * y así se conserva el tono reconocible sin pelearse con el contraste.
 */
export default function TypeBadge({ type }: { type: string }) {
    const color = typeColor(type);

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
