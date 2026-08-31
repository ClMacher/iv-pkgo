import { useState } from 'react';
import { getSpriteCandidates } from '../../services/sprites';
import type { SpriteVariant } from '../../services/sprites';
import { specialForm } from '../../services/poke-api';
import type { SpecialForm } from '../../services/poke-api';

/**
 * Halo de la forma especial. Va en `box-shadow` y no en un fondo porque la
 * sombra se dibuja por fuera de la caja: rodea al sprite sin taparlo, y por
 * eso el halo puede ir encima de la imagen sin necesidad de capas.
 *
 * Shadow conserva el morado de siempre. Mega superpone tres sombras —cian,
 * violeta y ámbar— para insinuar el aura de colores de las referencias.
 *
 * El tamaño se topa antes de calcular: creciendo en proporción pura, en la
 * tarjeta grande el halo se inflaba hasta llenar la caja y el sprite quedaba
 * dentro de una mancha. Topado, sigue siendo un borde a cualquier tamaño.
 */
function halo(form: Exclude<SpecialForm, null>, size: number): string {
    const base = Math.min(size, 56);
    const blur = Math.max(4, base / 6);
    const spread = Math.max(1, base / 16);

    if (form === 'shadow') {
        return `0 0 ${blur}px ${spread}px rgba(147, 51, 234, 0.75)`;
    }

    return [
        `0 0 ${blur * 0.7}px ${spread}px rgba(34, 211, 238, 0.7)`,
        `0 0 ${blur * 1.3}px ${spread * 2}px rgba(168, 85, 247, 0.5)`,
        `0 0 ${blur * 2}px ${spread * 3}px rgba(251, 191, 36, 0.35)`,
    ].join(', ');
}

interface PokemonSpriteProps {
    pokemon: any | null;
    variant?: SpriteVariant;
    className?: string;
    /** Lado en píxeles. Es un atributo, no un estilo, para que una clase CSS pueda ganarle. */
    size?: number;
}

/**
 * Muestra el sprite de una forma concreta, no el de su forma base.
 *
 * Va bajando por las URLs que propone el servicio hasta que una carga: primero
 * el arte de Pokémon GO, y si esa forma no tiene asset, PokeAPI. A las formas
 * Shadow les pinta el aura encima, porque comparten sprite con el Pokémon
 * normal y si no serían indistinguibles.
 */
export default function PokemonSprite({
    pokemon,
    variant = 'icon',
    className,
    size = 24,
}: PokemonSpriteProps) {
    const candidates = getSpriteCandidates(pokemon, variant);
    const key = `${pokemon?.speciesId ?? ''}|${variant}`;

    // El índice se guarda junto a la especie a la que pertenece: al cambiar de
    // Pokémon vuelve solo a cero, sin necesidad de un efecto que lo resetee.
    const [attempt, setAttempt] = useState({ key, index: 0 });
    const index = attempt.key === key ? attempt.index : 0;

    if (!pokemon || candidates.length === 0) return null;

    const image = (
        <img
            src={candidates[Math.min(index, candidates.length - 1)]}
            alt={pokemon.speciesName ?? ''}
            className={className}
            width={size}
            height={size}
            loading="lazy"
            onError={() => {
                if (index < candidates.length - 1) {
                    setAttempt({ key, index: index + 1 });
                }
            }}
        />
    );

    const form = specialForm(pokemon);
    if (!form) return image;

    return (
        <span style={{ position: 'relative', display: 'inline-flex', flex: '0 0 auto' }}>
            {image}
            <span
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: '-2px',
                    borderRadius: '50%',
                    boxShadow: halo(form, size),
                    pointerEvents: 'none',
                }}
            />
        </span>
    );
}
