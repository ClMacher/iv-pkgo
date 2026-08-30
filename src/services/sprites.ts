import gamemaster from "../data/gamemaster.json";

/**
 * Resolución de sprites por forma.
 *
 * El gamemaster de PvPoke identifica cada forma con `speciesId`
 * (venusaur_mega, rattata_alolan, zapdos_galarian...), pero el repo de sprites
 * de PokeAPI nombra sus archivos por ID numérico: `venusaur-mega.png` no
 * existe, `10033.png` sí. Por eso construir la URL con el speciesId da 404
 * siempre y todas las formas acaban cayendo a la forma base.
 *
 * Orden de preferencia:
 *   1. PokeMiners, que es el arte real de Pokémon GO (46 de las 59 megas,
 *      y todas las formas de Alola, Galar y Hisui).
 *   2. PokeAPI por ID de forma, para las megas que GO todavía no tiene.
 *   3. PokeAPI por número de Pokédex, que existe siempre.
 *
 * Ninguna de las dos fuentes es nuestra. Para producción conviene descargar
 * los assets y servirlos desde nuestro propio hosting.
 */

export type SpriteVariant = "icon" | "artwork";

const GO_ASSETS =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets";
const POKEAPI_SPRITES =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/**
 * IDs de forma de PokeAPI, para las formas con nombre propio. Generado
 * consultando /api/v2/pokemon: resuelve 150 de las 204 formas del gamemaster,
 * entre ellas las 59 megas —incluidas las que PvPoke trae pero GO aún no ha
 * sacado— y todas las de Alola, Galar e Hisui.
 *
 * Las claves van sin el sufijo `_shadow`, que en GO no cambia el aspecto.
 * Las 54 que faltan son variantes de tipo (Arceus, Silvally) donde el arte de
 * GO o la forma base sirven igual.
 */
const FORM_POKEAPI_IDS: Record<string, number> = {
  abomasnow_mega: 10060,
  absol_mega: 10057,
  aerodactyl_mega: 10042,
  aggron_mega: 10053,
  alakazam_mega: 10037,
  altaria_mega: 10067,
  ampharos_mega: 10045,
  arcanine_hisuian: 10230,
  articuno_galarian: 10169,
  audino_mega: 10069,
  avalugg_hisuian: 10243,
  banette_mega: 10056,
  beedrill_mega: 10090,
  blastoise_mega: 10036,
  blaziken_mega: 10050,
  braviary_hisuian: 10240,
  camerupt_mega: 10087,
  castform_rainy: 10014,
  castform_snowy: 10015,
  castform_sunny: 10013,
  charizard_mega_x: 10034,
  charizard_mega_y: 10035,
  chesnaught_mega: 10292,
  corsola_galarian: 10173,
  cramorant_gorging: 10183,
  cramorant_gulping: 10182,
  darumaka_galarian: 10176,
  decidueye_hisuian: 10244,
  delphox_mega: 10293,
  deoxys_attack: 10001,
  deoxys_defense: 10002,
  deoxys_speed: 10003,
  dialga_origin: 10245,
  diancie_mega: 10075,
  diglett_alolan: 10105,
  dragonite_mega: 10281,
  dugtrio_alolan: 10106,
  eiscue_ice: 875,
  eiscue_noice: 10185,
  electrode_hisuian: 10232,
  eternatus_eternamax: 10190,
  exeggutor_alolan: 10114,
  falinks_mega: 10303,
  farfetchd_galarian: 10166,
  gallade_mega: 10068,
  garchomp_mega: 10058,
  gardevoir_mega: 10051,
  gengar_mega: 10038,
  geodude_alolan: 10109,
  glalie_mega: 10074,
  golem_alolan: 10111,
  graveler_alolan: 10110,
  greninja_mega: 10294,
  grimer_alolan: 10112,
  groudon_primal: 10078,
  growlithe_hisuian: 10229,
  gyarados_mega: 10041,
  heracross_mega: 10047,
  hoopa_unbound: 10086,
  houndoom_mega: 10048,
  kangaskhan_mega: 10039,
  kyogre_primal: 10077,
  kyurem_black: 10022,
  kyurem_white: 10023,
  latias_mega: 10062,
  latios_mega: 10063,
  lilligant_hisuian: 10237,
  linoone_galarian: 10175,
  lopunny_mega: 10088,
  lucario_mega: 10059,
  malamar_mega: 10297,
  manectric_mega: 10055,
  marowak_alolan: 10115,
  maushold_family_of_four: 925,
  maushold_family_of_three: 10257,
  mawile_mega: 10052,
  medicham_mega: 10054,
  meowstic_female: 10025,
  meowth_alolan: 10107,
  meowth_galarian: 10161,
  metagross_mega: 10076,
  mewtwo_mega_x: 10043,
  mewtwo_mega_y: 10044,
  mimikyu_busted: 10143,
  moltres_galarian: 10171,
  mr_mime_galarian: 10168,
  muk_alolan: 10113,
  necrozma_ultra: 10157,
  ninetales_alolan: 10104,
  oinkologne_female: 10254,
  palafin_hero: 10256,
  palafin_zero: 964,
  palkia_origin: 10246,
  persian_alolan: 10108,
  pidgeot_mega: 10073,
  pikachu_libre: 10084,
  pikachu_pop_star: 10082,
  pikachu_rock_star: 10080,
  pinsir_mega: 10040,
  ponyta_galarian: 10162,
  qwilfish_hisuian: 10234,
  raichu_alolan: 10100,
  raichu_mega_x: 10304,
  raichu_mega_y: 10305,
  rapidash_galarian: 10163,
  raticate_alolan: 10092,
  rattata_alolan: 10091,
  rayquaza_mega: 10079,
  rotom_fan: 10011,
  rotom_frost: 10010,
  rotom_heat: 10008,
  rotom_mow: 10012,
  rotom_wash: 10009,
  sableye_mega: 10066,
  salamence_mega: 10089,
  samurott_hisuian: 10236,
  sandshrew_alolan: 10101,
  sandslash_alolan: 10102,
  sceptile_mega: 10065,
  scizor_mega: 10046,
  sharpedo_mega: 10070,
  skarmory_mega: 10284,
  slowbro_galarian: 10165,
  slowbro_mega: 10071,
  slowking_galarian: 10172,
  slowpoke_galarian: 10164,
  sneasel_hisuian: 10235,
  starmie_mega: 10280,
  steelix_mega: 10072,
  stunfisk_galarian: 10180,
  swampert_mega: 10064,
  toxtricity_amped: 849,
  toxtricity_low_key: 10184,
  typhlosion_hisuian: 10233,
  tyranitar_mega: 10049,
  venusaur_mega: 10033,
  victreebel_mega: 10279,
  voltorb_hisuian: 10231,
  vulpix_alolan: 10103,
  weezing_galarian: 10167,
  wishiwashi_school: 10127,
  wishiwashi_solo: 746,
  wooper_paldean: 10253,
  yamask_galarian: 10179,
  zapdos_galarian: 10170,
  zigzagoon_galarian: 10174,
  zoroark_hisuian: 10239,
  zorua_hisuian: 10238,
  zygarde_10: 10181,
  zygarde_complete: 10120,
};

/**
 * Sufijo del speciesId -> token de forma en los assets de GO, sólo donde
 * ambos difieren. El resto se traduce poniéndolo en mayúsculas.
 */
const GO_FORM_ALIASES: Record<string, string> = {
  alolan: "ALOLA",
  paldean: "PALDEA",
  aqua: "PALDEA_AQUA",
  blaze: "PALDEA_BLAZE",
  combat: "PALDEA_COMBAT",
  armored: "A",
};

/**
 * Dex de cada speciesId. Hace falta para saber si un tramo tras el guion bajo
 * es una forma o parte del nombre: `venusaur_mega` comparte dex con
 * `venusaur`, luego `mega` es una forma; `porygon_z` es el dex 474 y
 * `porygon` el 137, luego `porygon_z` es el nombre entero.
 */
const DEX_BY_SPECIES_ID: Map<string, number> = new Map(
  ((gamemaster as any).pokemon ?? []).map((p: any) => [
    String(p.speciesId),
    Number(p.dex),
  ]),
);

export interface SplitSpecies {
  /** Nombre de la especie sin sufijos de forma. */
  base: string;
  /** Tramos de forma, ya sin `shadow`. */
  form: string[];
  isShadow: boolean;
}

/**
 * Separa un speciesId en especie base y forma, apoyándose en el propio
 * gamemaster en vez de en una lista de nombres compuestos escrita a mano.
 * Así sigue funcionando cuando PvPoke añada formas nuevas.
 */
export function splitSpeciesId(speciesId: string, dex: number): SplitSpecies {
  const parts = speciesId.split("_");

  for (let i = 1; i < parts.length; i++) {
    const base = parts.slice(0, i).join("_");
    if (DEX_BY_SPECIES_ID.get(base) === dex) {
      const rest = parts.slice(i);
      return {
        base,
        form: rest.filter((p) => p !== "shadow"),
        isShadow: rest.includes("shadow"),
      };
    }
  }

  return { base: speciesId, form: [], isShadow: false };
}

export function isShadowForm(pokemon: any): boolean {
  return String(pokemon?.speciesId ?? "").endsWith("_shadow");
}

function goFormToken(form: string[]): string {
  if (form.length === 0) return "";
  const joined = form.join("_");
  return GO_FORM_ALIASES[joined] ?? joined.toUpperCase();
}

function pokeApiUrl(id: number, variant: SpriteVariant): string {
  return variant === "artwork"
    ? `${POKEAPI_SPRITES}/other/official-artwork/${id}.png`
    : `${POKEAPI_SPRITES}/${id}.png`;
}

/**
 * URLs a probar en orden. El componente va bajando por la lista cuando una
 * falla, así que la última tiene que ser siempre una que exista.
 *
 * Para la tarjeta grande (`artwork`) se antepone el arte oficial de PokeAPI,
 * que es 475x475 constante, porque los iconos de GO van de 75 a 230 px y con
 * proporciones distintas: en una caja grande unos salen diminutos y otros
 * borrosos. Sólo se antepone cuando hay un ID exacto de esa forma —la forma
 * base, o una forma que esté en la tabla—, nunca a ciegas por dex, que
 * devolvería la forma equivocada.
 *
 * GO no tiene assets propios para las formas Shadow: se usa el del Pokémon
 * normal y el aura la pinta el componente.
 */
export function getSpriteCandidates(
  pokemon: any,
  variant: SpriteVariant = "icon",
): string[] {
  if (!pokemon) return [];

  const dex = Number(pokemon.dex ?? pokemon.id);
  if (!Number.isFinite(dex)) return [];

  const speciesId = String(pokemon.speciesId ?? "");
  const { base, form } = speciesId
    ? splitSpeciesId(speciesId, dex)
    : { base: "", form: [] as string[] };

  const token = goFormToken(form);
  // El sufijo _shadow no cambia el aspecto, así que la tabla no lo lleva.
  const formId = FORM_POKEAPI_IDS[speciesId.replace(/_shadow$/, "")];

  const goUrls = token
    ? [
        `${GO_ASSETS}/pm${dex}.f${token}.icon.png`,
        // Algunas formas repiten el nombre de la especie: pm412.fBURMY_PLANT
        `${GO_ASSETS}/pm${dex}.f${base.toUpperCase()}_${token}.icon.png`,
      ]
    : [`${GO_ASSETS}/pm${dex}.icon.png`];

  // PokeAPI identifica con certeza la forma base (por dex) y las que están en
  // la tabla. Para el resto, pedir el dex daría la forma base equivocada.
  const exactPokeApiId = formId ?? (token ? null : dex);

  const urls: string[] = [];
  if (variant === "artwork" && exactPokeApiId !== null) {
    urls.push(pokeApiUrl(exactPokeApiId, variant));
  }
  urls.push(...goUrls);
  if (formId) urls.push(pokeApiUrl(formId, variant));
  urls.push(pokeApiUrl(dex, variant));

  return [...new Set(urls)];
}
