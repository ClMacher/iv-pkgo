/**
 * Colores de tipo, en la gama que usan PvPoke y los recursos de la comunidad.
 *
 * Viven aquí y no dentro del componente de la etiqueta porque la tarjeta los
 * necesita para su degradado, y exportar una constante desde un archivo de
 * componente rompe el Fast Refresh de React.
 */
export const TYPE_COLORS: Record<string, string> = {
  bug: "#92bc2c",
  dark: "#7a7a8c",
  dragon: "#4d8fe0",
  electric: "#f2d94e",
  fairy: "#ee90e6",
  fighting: "#d3425f",
  fire: "#fba54c",
  flying: "#a1bbec",
  ghost: "#8f7fd4",
  grass: "#5fbd58",
  ground: "#da7c4d",
  ice: "#75d0c1",
  normal: "#a0a29f",
  poison: "#b763cf",
  psychic: "#fa8581",
  rock: "#c9bb8a",
  steel: "#5a8ea2",
  water: "#539ddf",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.normal;
}

/**
 * Degradado de fondo de la tarjeta, tomado de los tipos del Pokémon.
 *
 * Las opacidades son bajas a propósito: el degradado va encima del slate-800 y
 * tiene que teñir sin comerse el contraste del texto. Con un solo tipo se usa
 * el mismo color en los dos extremos, así que queda un desvanecido en vez de
 * una mezcla.
 */
export function typeGradient(types: string[]): string {
  const primero = typeColor(types[0] ?? "normal");
  const segundo = typeColor(types[1] ?? types[0] ?? "normal");

  return `linear-gradient(115deg, ${primero}59 0%, ${primero}26 38%, ${segundo}2e 72%, ${segundo}0a 100%)`;
}

/**
 * Las megas ignoran el tipo: usan el irisado de la piedra activadora, que es
 * lo que las identifica en el juego.
 */
export const MEGA_GRADIENT =
  "linear-gradient(115deg, #f472b64d 0%, #a855f74d 26%, #22d3ee4d 50%, #4ade804d 74%, #facc154d 100%)";
