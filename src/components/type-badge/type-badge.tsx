import { typeColor } from '../../services/type-colors';

/**
 * Icono del tipo elemental. En vez del texto se muestra la imagen del asset de
 * PokeMiners para que el buscador y las tarjetas estén más claros visualmente.
 */
export default function TypeBadge({ type }: { type: string }) {
    const normalizedType = String(type || '').toLowerCase();
    const color = typeColor(type);
    const assetMap: Record<string, string> = {
        bug: 'POKEMON_TYPE_BUG.webp',
        dark: 'POKEMON_TYPE_DARK.webp',
        dragon: 'POKEMON_TYPE_DRAGON.webp',
        electric: 'POKEMON_TYPE_ELECTRIC.webp',
        fairy: 'POKEMON_TYPE_FAIRY.webp',
        fighting: 'POKEMON_TYPE_FIGHTING.webp',
        fire: 'POKEMON_TYPE_FIRE.webp',
        flying: 'POKEMON_TYPE_FLYING.webp',
        ghost: 'POKEMON_TYPE_GHOST.webp',
        grass: 'POKEMON_TYPE_GRASS.webp',
        ground: 'POKEMON_TYPE_GROUND.webp',
        ice: 'POKEMON_TYPE_ICE.webp',
        normal: 'POKEMON_TYPE_NORMAL.webp',
        poison: 'POKEMON_TYPE_POISON.webp',
        psychic: 'POKEMON_TYPE_PSYCHIC.webp',
        rock: 'POKEMON_TYPE_ROCK.webp',
        steel: 'POKEMON_TYPE_STEEL.webp',
        water: 'POKEMON_TYPE_WATER.webp',
    };
    const assetName = assetMap[normalizedType] ?? `${normalizedType}.webp`;

    return (
        <span
            className="inline-flex items-center justify-center px-1 py-0.5 leading-none"
            title={type}
            aria-label={type}
        >
            <img
                src={`${import.meta.env.BASE_URL}assets/types/${assetName}`}
                alt={type}
                className="h-6 w-6 object-contain"
            />
        </span>
    );
}
