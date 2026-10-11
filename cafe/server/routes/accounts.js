import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { User, Session, Audit } from '../models.js';
import { authenticated, manager, publicUser, loginSession, cookie } from '../auth.js';
import { wrap, parse, text, fail, id, list, search } from '../utils.js';
export const accounts = Router();
const email = z
  .email()
  .max(120)
  .transform((x) => x.toLowerCase().trim());
const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72)
  .refine((x) => /[A-Za-z]/.test(x) && /\d/.test(x), 'Include letters and numbers.');
const limit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});
accounts.post(
  '/auth/register',
  limit,
  wrap(async (req, res) => {
    const data = parse(z.object({ name: text(2, 80), email, password }).strict(), req.body);
    await User.create({
      ...data,
      password: await bcrypt.hash(data.password, 12),
    });
    res.status(201).json({
      message: 'Registration submitted. A manager must approve your account before login.',
    });
  }),
);
accounts.post(
  '/auth/login',
  limit,
  wrap(async (req, res) => {
    const data = parse(z.object({ email, password: z.string().min(1).max(72) }).strict(), req.body);
    const u = await User.findOne({ email: data.email }).select('+password');
    if (!u || !(await bcrypt.compare(data.password, u.password))) fail(401, 'Invalid credentials.');
    if (u.status !== 'active')
      fail(
        403,
        u.status === 'pending'
          ? 'Your account is waiting for manager approval.'
          : 'Your account is disabled.',
      );
    await loginSession(u, res);
  }),
);
accounts.get('/auth/me', authenticated, (req, res) =>
  res.json({ user: publicUser(req.user), csrf: req.session.csrf }),
);
accounts.post(
  '/auth/logout',
  authenticated,
  wrap(async (req, res) => {
    await Session.deleteOne({ _id: req.session._id });
    res.clearCookie('coffee_session', cookie).json({ message: 'Logged out.' });
  }),
);
accounts.patch(
  '/profile',
  authenticated,
  wrap(async (req, res) => {
    const data = parse(z.object({ name: text(2, 80) }).strict(), req.body);
    req.user.name = data.name;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }),
);
accounts.post(
  '/profile/password',
  authenticated,
  wrap(async (req, res) => {
    const data = parse(
      z
        .object({
          currentPassword: z.string().min(1).max(72),
          newPassword: password,
        })
        .strict(),
      req.body,
    );
    const u = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(data.currentPassword, u.password)))
      fail(400, 'Current password is incorrect.');
    u.password = await bcrypt.hash(data.newPassword, 12);
    await u.save();
    await Session.deleteMany({ user: u._id });
    res
      .clearCookie('coffee_session', cookie)
      .json({ message: 'Password updated. Please log in again.' });
  }),
);
accounts.get(
  '/users',
  authenticated,
  manager,
  wrap(async (req, res) => list(User, { name: search(req.query.q) }, req, res)),
);
accounts.patch(
  '/users/:id',
  authenticated,
  manager,
  wrap(async (req, res) => {
    const data = parse(z.object({ status: z.enum(['active', 'disabled']) }).strict(), req.body);
    if (String(req.user._id) === id(req.params.id))
      fail(400, 'You cannot change your own account status.');
    const u = await User.findById(req.params.id);
    if (!u) fail(404, 'User not found.');
    u.status = data.status;
    await u.save();
    if (data.status === 'disabled') await Session.deleteMany({ user: u._id });
    await Audit.create({
      actor: req.user.name,
      action: 'Account status',
      target: u.email,
      detail: data.status,
    });
    res.json(publicUser(u));
  }),
);
