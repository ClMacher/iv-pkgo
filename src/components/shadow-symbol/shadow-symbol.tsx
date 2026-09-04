/** Marca visual de un Pokémon Shadow. */
export default function ShadowSymbol({ className }: { className?: string }) {
    return (
        <img
            src={`${import.meta.env.BASE_URL}assets/indicators/shadow.webp`}
            alt="Shadow"
            className={className}
            width={192}
            height={192}
            loading="lazy"
        />
    );
}