import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const safe = (u: User) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });
const access = (user: User) => jwt.sign({ version: user.tokenVersion }, env.JWT_ACCESS_SECRET, { subject: String(user.id), expiresIn: '15m', issuer: 'flight-tickets', audience: 'flight-web', algorithm: 'HS256' });
async function session(user: User) {
  const refreshToken = randomBytes(48).toString('hex');
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hash(refreshToken), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  return { user: safe(user), accessToken: access(user), refreshToken };
}
export const authService = {
  async register(input: { fullName: string; email: string; password: string }) {
    const user = await userRepository.create(input.fullName, input.email, await bcrypt.hash(input.password, 12));
    return session(user);
  },
  async login(email: string, password: string) {
    const user = await userRepository.byEmail(email);
    // Constant-cost comparison also for unknown users.
    const valid = await bcrypt.compare(password, user?.passwordHash ?? '$2a$12$C6UzMDM.H6dfI/f/IKcEe.uz9Yo0NLiP3zzikHH5b.rM5a9wJ9jH6');
    if (!user?.isActive || !valid) throw new AppError('Email hoặc mật khẩu không đúng', 401);
    return session(user);
  },
  async refresh(raw: string) {
    const replacement = randomBytes(48).toString('hex');
    const user = await prisma.$transaction(async tx => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash: hash(raw) }, include: { user: true } });
      if (!stored || stored.expiresAt <= new Date() || !stored.user.isActive) throw new AppError('Phiên hết hạn', 401);
      const consumed = await tx.refreshToken.deleteMany({ where: { id: stored.id } });
      if (consumed.count !== 1) throw new AppError('Phiên đã được sử dụng', 401);
      await tx.refreshToken.create({ data: { userId: stored.userId, tokenHash: hash(replacement), expiresAt: stored.expiresAt } });
      return stored.user;
    });
    return { user: safe(user), accessToken: access(user), refreshToken: replacement };
  },
  async logout(raw?: string) { if (raw) await prisma.refreshToken.deleteMany({ where: { tokenHash: hash(raw) } }); },
  async forgot(email: string) {
    if (!env.SMTP_HOST) throw new AppError('Chức năng email chưa được cấu hình. Vui lòng liên hệ quản trị viên.', 503);
    const user = await userRepository.byEmail(email);
    if (!user?.isActive) return;
    const token = randomBytes(32).toString('hex');
    const record = await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 15 * 60000) } });
    try {
      await nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined }).sendMail({
        from: env.MAIL_FROM, to: email, subject: 'Đặt lại mật khẩu Flight Tickets',
        text: `Liên kết có hiệu lực 15 phút: ${env.FRONTEND_URL}/reset-password?token=${token}`,
      });
    } catch { await prisma.passwordResetToken.deleteMany({ where: { id: record.id } }); throw new AppError('Không gửi được email, vui lòng thử lại sau.', 503); }
  },
  async reset(token: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async tx => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash(token) } });
      if (!record || record.expiresAt <= new Date()) throw new AppError('Liên kết hết hạn hoặc không hợp lệ');
      const consumed = await tx.passwordResetToken.deleteMany({ where: { id: record.id } });
      if (consumed.count !== 1) throw new AppError('Liên kết đã được sử dụng');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    });
  },
  async changePassword(userId: number, current: string, replacement: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!await bcrypt.compare(current, user.passwordHash)) throw new AppError('Mật khẩu hiện tại không đúng');
    const passwordHash = await bcrypt.hash(replacement, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
    ]);
  },
};
