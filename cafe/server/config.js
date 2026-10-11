import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
  quiet: true,
});
export const config = {
  port: Number(process.env.PORT || 5000),
  uri: process.env.MONGODB_URI,
  secret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === 'production',
  origins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((x) => x.trim()),
};
export function checkConfig() {
  if (!config.uri)
    throw Error(
      'Set MONGODB_URI in server/.env. For a temporary sample database use npm run demo.',
    );
  if (!config.secret || config.secret.length < 32 || config.secret.startsWith('replace-'))
    throw Error('Run npm run setup or set a random JWT_SECRET of at least 32 characters.');
}
