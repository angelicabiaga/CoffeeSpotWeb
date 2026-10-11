import fs from 'node:fs';
import crypto from 'node:crypto';
const path = new URL('../server/.env', import.meta.url);
if (fs.existsSync(path)) console.log('server/.env already exists. Existing settings were kept.');
else {
  const text = fs
    .readFileSync(new URL('../server/.env.example', import.meta.url), 'utf8')
    .replace('replace-with-at-least-32-random-characters', crypto.randomBytes(48).toString('hex'));
  fs.writeFileSync(path, text);
  console.log('Created server/.env. Set MONGODB_URI and seed passwords, or use npm run demo.');
}
