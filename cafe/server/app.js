import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { ZodError } from 'zod';
import { config } from './config.js';
import { authenticated } from './auth.js';
import { accounts } from './routes/accounts.js';
import { catalog } from './routes/catalog.js';
import { operations } from './routes/operations.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// Reject cross-origin writes, including login and registration. Authenticated writes also require a session CSRF token.
app.use('/api', (req, res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.get('origin') &&
    !config.origins.includes(req.get('origin'))
  )
    return res.status(403).json({ message: 'Origin not allowed.' });
  next();
});
app.get('/api/health', (req, res) =>
  res.json({ ok: true, demo: process.env.DEMO_MODE === 'true' }),
);
app.use('/api', accounts);
app.use('/api', authenticated, catalog, operations);
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ZodError)
    return res.status(400).json({
      message: err.issues.map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`).join(' '),
    });
  if (err.code === 11000)
    return res.status(409).json({
      message: 'This record already exists. Use a unique email or checkout reference.',
    });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid record ID.' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'The request could not be completed. Please try again.' });
});
