import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Loaded before anything else reads process.env (main.ts imports this first). Hosts like Render set env vars directly.
const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
