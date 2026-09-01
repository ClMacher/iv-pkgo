import fs from "fs";
import path from "path";
import https from "https";
import sharp from "sharp";

const BASE_URL =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images";
const DEST_ROOT = path.join(process.cwd(), "public/assets");

const ASSET_FILES = [
  {
    dir: "leagues",
    file: "pogo_great_league.webp",
    url: `${BASE_URL}/Combat/pogo_great_league.png`,
  },
  {
    dir: "leagues",
    file: "pogo_ultra_league.webp",
    url: `${BASE_URL}/Combat/pogo_ultra_league.png`,
  },
  {
    dir: "leagues",
    file: "pogo_master_league.webp",
    url: `${BASE_URL}/Combat/pogo_master_league.png`,
  },

  {
    dir: "types",
    file: "POKEMON_TYPE_BUG.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_BUG.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_DARK.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_DARK.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_DRAGON.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_DRAGON.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_ELECTRIC.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_ELECTRIC.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_FAIRY.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_FAIRY.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_FIGHTING.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_FIGHTING.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_FIRE.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_FIRE.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_FLYING.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_FLYING.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_GHOST.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_GHOST.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_GRASS.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_GRASS.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_GROUND.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_GROUND.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_ICE.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_ICE.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_NORMAL.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_NORMAL.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_POISON.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_POISON.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_PSYCHIC.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_PSYCHIC.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_ROCK.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_ROCK.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_STEEL.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_STEEL.png`,
  },
  {
    dir: "types",
    file: "POKEMON_TYPE_WATER.webp",
    url: `${BASE_URL}/Types/POKEMON_TYPE_WATER.png`,
  },
];

async function downloadAndConvertToWebp(url, destinationPath) {
  const tempPngPath = `${destinationPath}.tmp.png`;

  await downloadFile(url, tempPngPath);
  await sharp(tempPngPath).webp({ quality: 90 }).toFile(destinationPath);
  fs.unlinkSync(tempPngPath);
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, { headers: { "User-Agent": "iv-pkgo" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (!redirectUrl) {
            reject(new Error(`Redirección sin ubicación para ${url}`));
            return;
          }
          downloadFile(redirectUrl, destination).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} para ${url}`));
          return;
        }

        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", (err) => {
        fs.unlink(destination, () => {});
        reject(err);
      });
  });
}

async function main() {
  fs.mkdirSync(DEST_ROOT, { recursive: true });

  const results = [];
  for (const asset of ASSET_FILES) {
    const dirPath = path.join(DEST_ROOT, asset.dir);
    const filePath = path.join(dirPath, asset.file);

    fs.mkdirSync(dirPath, { recursive: true });

    if (fs.existsSync(filePath)) {
      results.push(`${asset.file} ya existía`);
      continue;
    }

    try {
      await downloadAndConvertToWebp(asset.url, filePath);
      results.push(`${asset.file} descargado`);
    } catch (error) {
      results.push(`${asset.file} falló: ${error.message}`);
    }
  }

  console.log("✅ Assets de PokeMiners:");
  for (const entry of results) console.log(` - ${entry}`);
}

main().catch((err) => {
  console.error("❌ Error general:", err.message);
  process.exitCode = 1;
});
