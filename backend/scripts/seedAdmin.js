import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../src/models/User.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smarted.africa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD env var is required');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smarted_dev');

const existing = await User.findOne({ email: ADMIN_EMAIL });
if (existing) {
  console.log('Admin user already exists:', ADMIN_EMAIL);
} else {
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    confirmed: true,
  });
  console.log('Admin user created:', ADMIN_EMAIL);
}

await mongoose.disconnect();
