import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function flattenKeys(obj, prefix = '') {
  return Object.keys(obj).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

const messagesDir = join(__dirname, '..', 'messages');
const en = JSON.parse(readFileSync(join(messagesDir, 'en.json'), 'utf8'));
const cs = JSON.parse(readFileSync(join(messagesDir, 'cs.json'), 'utf8'));

const enKeys = new Set(flattenKeys(en));
const csKeys = new Set(flattenKeys(cs));

const missingInCs = [...enKeys].filter((k) => !csKeys.has(k));
const extraInCs = [...csKeys].filter((k) => !enKeys.has(k));

if (missingInCs.length > 0 || extraInCs.length > 0) {
  if (missingInCs.length > 0) console.error(`Missing keys in cs.json: ${missingInCs.join(', ')}`);
  if (extraInCs.length > 0) console.error(`Extra keys in cs.json (not in en.json): ${extraInCs.join(', ')}`);
  process.exit(1);
}

console.log(`Locale keys in sync (${enKeys.size} keys).`);
