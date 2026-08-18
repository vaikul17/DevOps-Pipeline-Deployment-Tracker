import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { generateToken } from '../middleware/auth';

export const authRoutes = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  orgSlug: z.string().optional(),
});

// POST /api/v1/auth/login
authRoutes.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, orgId: user.orgId });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/register
authRoutes.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Find or create org
    let org = await prisma.organization.findFirst({ where: { slug: body.orgSlug || 'default' } });
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Default Org', slug: body.orgSlug || 'default' },
      });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        orgId: org.id,
        role: 'admin',
      },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role, orgId: user.orgId });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});
