import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AppError('Vui lòng đăng nhập', 401);
  let payload: jwt.JwtPayload;
  try { payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'flight-tickets', audience: 'flight-web' }) as jwt.JwtPayload; }
  catch { throw new AppError('Phiên đăng nhập đã hết hạn', 401); }
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  if (!user?.isActive || user.tokenVersion !== payload.version) throw new AppError('Phiên đăng nhập không hợp lệ', 401);
  req.auth = { id: user.id, role: user.role };
  next();
}
export function admin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== 'ADMIN') throw new AppError('Chỉ quản trị viên có quyền thực hiện', 403);
  next();
}
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization) return authenticate(req, res, next);
  next();
}
export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.get('origin') !== env.FRONTEND_URL) throw new AppError('Origin không được phép', 403);
  next();
}
