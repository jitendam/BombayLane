const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { authValidators, handleValidationErrors } = require('../middleware/validation');
const { getSupabaseAdmin } = require('../lib/supabase');

const router = express.Router();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

const USER_SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, address: true, preferences: true,
  isDeleted: true, createdAt: true, updatedAt: true
};

router.post('/register', authValidators.register, handleValidationErrors, async (req, res, next) => {
  try {
    const { name, password, role, phone, address } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    const existing = await prisma.user.findFirst({ where: { email, isDeleted: false } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, phone, address },
      select: USER_SAFE_SELECT
    });

    const token = generateToken({ id: user.id, role: user.role });
    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, authValidators.login, handleValidationErrors, async (req, res, next) => {
  try {
    const password = req.body.password;
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await prisma.user.findFirst({ where: { email, isDeleted: false } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account uses GitHub login. Please use the "Login with GitHub" button.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, role: user.role });
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

// Step 1: redirect the browser to Supabase → GitHub
router.get('/github', (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    return res.status(503).json({ success: false, message: 'GitHub login is not configured' });
  }
  const appBase = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  const callbackUrl = `${appBase}/pages/auth-callback.html`;
  const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(callbackUrl)}`;
  return res.redirect(authUrl);
});

// Step 2: receive the Supabase access_token from the callback page and issue a JWT
router.post('/github/exchange', authLimiter, async (req, res, next) => {
  try {
    const { access_token } = req.body;
    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({ success: false, message: 'access_token is required' });
    }

    const supabase = getSupabaseAdmin();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(access_token);

    if (error || !supabaseUser) {
      return res.status(401).json({ success: false, message: 'Invalid GitHub token' });
    }

    const email = (supabaseUser.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'GitHub account must have a public email' });
    }

    // GitHub user_metadata field priority: full_name (display name) → name → user_name (login handle)
    const name = supabaseUser.user_metadata?.full_name
      || supabaseUser.user_metadata?.name
      || supabaseUser.user_metadata?.user_name
      || email.split('@')[0];

    // Upsert the user – create if not present, update name if already exists
    let user = await prisma.user.findFirst({ where: { email, isDeleted: false } });
    if (!user) {
      user = await prisma.user.create({
        data: { name, email, password: null, role: 'customer' },
        select: USER_SAFE_SELECT
      });
    }

    const token = generateToken({ id: user.id, role: user.role });
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, (_req, res) => res.json({ success: true, message: 'Logged out successfully' }));

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('phone').optional().isString(),
  body('address').optional().isString()
], handleValidationErrors, async (req, res, next) => {
  try {
    const updates = {
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.phone && { phone: req.body.phone }),
      ...(req.body.address && { address: req.body.address }),
      ...(req.body.preferences && { preferences: req.body.preferences })
    };

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: USER_SAFE_SELECT
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
