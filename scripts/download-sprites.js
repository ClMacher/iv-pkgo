import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getRemoteSpriteCandidates } from "../src/services/sprites.ts";
import gamemaster from "../src/data/gamemaster.json" with { type: "json" };

/**
 * Descarga los iconos de Pokémon GO y los deja en /public para servirlos
 * desde nuestro propio hosting.
 *
 * Por qué, en corto: el icono de PokeMiners pesa ~25 KB a 154x183 px y se
 * pinta a 24x24. Reescalado a WebP baja a ~2 KB, y de paso deja de depender
 * de raw.githubusercontent, que no es un CDN y limita el tráfico.
 *
 * La resolución de URLs no se reimplementa aquí: se importa la misma
 * `getSpriteCandidates` que usa la app, para que las dos no se separen cuando
 * se añadan formas nuevas a la tabla.
 *
 * Es incremental. Un archivo ya descargado se salta, así que en un build
 * normal no sale ni una petición a la red. Sólo baja lo que falta.
 *
 * Uso:
 *   node scripts/download-sprites.js              // sólo lo que falta
 *   node scripts/download-sprites.js --refresh    // vuelve a bajarlo todo
 */

const DESTINATION = path.join(process.cwd(), "public/sprites");
const PENDING_FILE = path.join(process.cwd(), "scripts/sprites-pending.json");

/** 4x el tamaño al que se pintan hoy (24 px), con margen para pantallas densas. */
const SIZE = 96;
const CONCURRENCY = 8;

/**
 * PvPoke añade una forma al gamemaster en cuanto se filtra, semanas antes de
 * que PokeMiners tenga el asset. Esas quedan anotadas como pendientes y se
 * reintentan pasados unos días, en vez de darlas por imposibles para siempre
 * o volver a pedirlas en cada build.
 */
const PENDING_TTL_DAYS = 7;

const refresh = process.argv.includes("--refresh");

/**
 * Un `speciesId` con sufijo `_shadow` comparte el arte con el Pokémon normal
 * —el aura la pinta el componente—, así que se descarga una sola vez con el
 * nombre de la forma base.
 */
function baseId(speciesId) {
  return String(speciesId).replace(/_shadow$/, "");
}

function listaDeEspecies() {
  const porId = new Map();

  for (const pokemon of gamemaster.pokemon ?? []) {
    const id = baseId(pokemon.speciesId);
    // La entrada no-shadow es la preferida; la shadow sólo sirve de respaldo
    // para las formas que en el gamemaster existen únicamente como oscuras.
    if (!porId.has(id) || !String(pokemon.speciesId).endsWith("_shadow")) {
      porId.set(id, pokemon);
    }
  }

  return [...porId.entries()].map(([id, pokemon]) => ({ id, pokemon }));
}

function leerPendientes() {
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
  } catch {
    return {};
  }
}

function siguePendiente(pendientes, id) {
  const fecha = pendientes[id];
  if (!fecha) return false;
  const dias = (Date.now() - new Date(fecha).getTime()) / 86400000;
  return dias < PENDING_TTL_DAYS;
}

async function descargar(url, intento = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "iv-pkgo" } });

    // GitHub responde 429 cuando se le pide demasiado seguido. Conviene
    // esperar y reintentar en vez de dar el sprite por inexistente.
    if (res.status === 429 || res.status === 503) {
      if (intento >= 3) return null;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** intento));
      return descargar(url, intento + 1);
    }

    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function enParalelo(items, limite, tarea) {
  let siguiente = 0;
  const trabajadores = Array.from(
    { length: Math.min(limite, items.length) },
    async () => {
      while (siguiente < items.length) {
        await tarea(items[siguiente++]);
      }
    },
  );
  await Promise.all(trabajadores);
}

async function main() {
  fs.mkdirSync(DESTINATION, { recursive: true });

  const pendientes = leerPendientes();
  const todas = listaDeEspecies();

  const cola = todas.filter(({ id }) => {
    if (refresh) return true;
    if (fs.existsSync(path.join(DESTINATION, `${id}.webp`))) return false;
    return !siguePendiente(pendientes, id);
  });

  if (cola.length === 0) {
    console.log("✅ Sprites al día, no hay nada que descargar.");
    return;
  }

  console.log(
    `⏳ Descargando ${cola.length} sprites de ${todas.length} (concurrencia ${CONCURRENCY})...`,
  );

  const fallidos = [];
  let listos = 0;
  let bytes = 0;

  await enParalelo(cola, CONCURRENCY, async ({ id, pokemon }) => {
    // Sólo la variante "icon": el arte grande de 475 px se sigue pidiendo
    // remoto, porque se muestra de a uno y no compensa su peso en el repo.
    for (const url of getRemoteSpriteCandidates(pokemon, "icon")) {
      const original = await descargar(url);
      if (!original) continue;

      try {
        const webp = await sharp(original)
          .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer();

        fs.writeFileSync(path.join(DESTINATION, `${id}.webp`), webp);
        bytes += webp.length;
        listos++;

        if (listos % 100 === 0) {
          console.log(`   ${listos}/${cola.length}`);
        }
        return;
      } catch (e) {
        console.warn(`   ⚠️  ${id}: no se pudo convertir (${e.message})`);
      }
    }

    fallidos.push(id);
  });

  // Los que siguen sin asset se reintentan cuando caduque el TTL. Los que
  // ahora sí se descargaron salen de la lista.
  const nuevosPendientes = { ...pendientes };
  for (const id of cola.map((c) => c.id)) delete nuevosPendientes[id];
  for (const id of fallidos) nuevosPendientes[id] = new Date().toISOString();

  fs.writeFileSync(
    PENDING_FILE,
    JSON.stringify(nuevosPendientes, null, 2) + "\n",
  );

  console.log(
    `✅ ${listos} sprites descargados (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
  );

  if (fallidos.length) {
    console.log(
      `ℹ️  ${fallidos.length} sin asset todavía; se reintentan en ${PENDING_TTL_DAYS} días. La app las sigue mostrando desde remoto.`,
    );
  }
}

main().catch((err) => {
  console.error("❌ Error descargando sprites:", err.message);
  process.exitCode = 1;
});
