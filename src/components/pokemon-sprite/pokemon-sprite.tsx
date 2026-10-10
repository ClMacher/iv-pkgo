import { useState } from 'react';
import { getSpriteCandidates } from '../../services/sprites';
import type { SpriteVariant } from '../../services/sprites';

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
 * el arte de Pokémon GO, y si esa forma no tiene asset, PokeAPI.
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

    return image;
}
