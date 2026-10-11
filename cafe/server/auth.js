import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User, Session } from './models.js';
import { config } from './config.js';
import { fail, wrap } from './utils.js';
export const cookie = {
  httpOnly: true,
  secure: config.production,
  sameSite: 'strict',
  path: '/',
};
export const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
});
export const authenticated = wrap(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify(req.cookies.coffee_session || '', config.secret, {
      algorithms: ['HS256'],
      issuer: 'coffee-spot',
    });
  } catch {
    fail(401, 'Please log in to continue.');
  }
  const session = await Session.findOne({
    tokenId: payload.jti,
    user: payload.sub,
    expiresAt: { $gt: new Date() },
  });
  if (!session) fail(401, 'Your session has ended. Please log in again.');
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') fail(401, 'Your account is not active.');
  req.user = user;
  req.session = session;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('X-CSRF-Token') !== session.csrf)
      fail(403, 'Security check failed. Refresh the page and try again.');
  }
  next();
});
export const manager = (req, res, next) => {
  if (req.user.role !== 'manager')
    return next(Object.assign(Error('Manager access is required.'), { status: 403 }));
  next();
};
export async function loginSession(user, res) {
  const tokenId = crypto.randomUUID(),
    csrf = crypto.randomBytes(32).toString('hex');
  await Session.create({
    user: user._id,
    tokenId,
    csrf,
    expiresAt: new Date(Date.now() + 8 * 3600000),
  });
  const token = jwt.sign({}, config.secret, {
    subject: String(user._id),
    jwtid: tokenId,
    expiresIn: '8h',
    issuer: 'coffee-spot',
    algorithm: 'HS256',
  });
  res.cookie('coffee_session', token, { ...cookie, maxAge: 8 * 3600000 });
  res.json({ user: publicUser(user), csrf });
}
