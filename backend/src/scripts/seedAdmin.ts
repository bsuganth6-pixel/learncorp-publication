import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User, isAdminRole } from '../models/User';
import { passwordProblem } from '../validators/password';

/**
 * Provisions the first administrator (the only way an admin account comes into existence: there is
 * no public admin sign-up). Reads SEED_ADMIN_* from .env, refuses weak passwords, never prints the
 * password, and never promotes an existing author account.
 */
async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Admin';
  const role = process.env.SEED_ADMIN_ROLE === 'admin' ? 'admin' : 'superadmin';

  if (!email || !password) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding.');
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(`SEED_ADMIN_PASSWORD is not acceptable: ${problem}.`);
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name, email, password, role, status: 'active', emailVerified: true, emailVerifiedAt: new Date() });
    console.log(`Created ${role} account for ${email}. Sign in at /admin/login.`);
  } else if (isAdminRole(existing.role)) {
    console.log(`An administrator account already exists for ${email} — nothing to do.`);
  } else {
    console.error(`${email} is an author account. It is not promoted automatically; use a different email for the administrator.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
