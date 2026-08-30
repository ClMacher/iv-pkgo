import fs from "fs";
import https from "https";
import path from "path";

const URL =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";
const DESTINATION = path.join(process.cwd(), "src/data/gamemaster.json");

const dir = path.dirname(DESTINATION);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log("⏳ Descargando el GameMaster desde PvPoke...");

https
  .get(URL, { headers: { "User-Agent": "NodeJS" } }, (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      // Manejar redirecciones de GitHub si ocurren
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`❌ Error en la descarga: Código ${res.statusCode}`);
      return;
    }

    const fileStream = fs.createWriteStream(DESTINATION);
    res.pipe(fileStream);

    fileStream.on("finish", () => {
      fileStream.close();
      console.log("✅ ¡GameMaster descargado correctamente!");
    });
  })
  .on("error", (err) => {
    console.error("❌ Error de red:", err.message);
  });
