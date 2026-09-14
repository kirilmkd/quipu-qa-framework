import fs from 'fs';
import path from 'path';

const region = process.env.REGION || 'us';
const configPath = path.join(process.cwd(), 'config', 'regions', `${region}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`Region config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
export default config;
