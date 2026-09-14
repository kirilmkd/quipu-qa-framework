// src/regionConfig.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const region = process.env.REGION || "us"; // default to US
const configPath = path.join(__dirname, `../config/regions/${region}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`Region config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
export default config;
