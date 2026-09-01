/**
 * Marca de Mega Evolución.
 *
 * `public/assets/indicators/mega-stone.webp` (192 px, 8 KB) sale de recortar la esfera de una
 * imagen de 720x1280 que pesaba 235 KB: `extract({ left: 196, top: 476, width:
 * 328, height: 328 })`, máscara circular y `resize`. El original ya no está en
 * el repo, así que si hace falta regenerarlo a otro tamaño hay que volver a
 * conseguirlo; quedan anotadas las medidas para no tener que buscarlas de nuevo.
 *
 * Va como componente y no como <img> suelto para que la tarjeta no tenga que
 * saber de rutas ni tamaños: si el arte cambia, cambia aquí y en ningún lado más.
 */
export default function MegaSymbol({ className }: { className?: string }) {
    return (
        <img
            src="/assets/indicators/mega-stone.webp"
            alt=""
            aria-hidden="true"
            className={className}
            width={192}
            height={192}
            loading="lazy"
        />
    );
}
