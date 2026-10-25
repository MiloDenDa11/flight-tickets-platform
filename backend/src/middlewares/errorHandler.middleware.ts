import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error';
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) { res.status(422).json({ success: false, message: 'Dữ liệu không hợp lệ', errors: err.flatten() }); return; }
  if (err instanceof AppError) { res.status(err.statusCode).json({ success: false, message: err.message }); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const status = err.code === 'P2025' ? 404 : 409;
    res.status(status).json({ success: false, message: err.code === 'P2002' ? 'Dữ liệu đã tồn tại' : 'Dữ liệu thay đổi hoặc còn liên kết. Vui lòng tải lại và thử lại.' }); return;
  }
  if (err instanceof SyntaxError) { res.status(400).json({ success: false, message: 'JSON không hợp lệ' }); return; }
  console.error('[API]', err.name);
  res.status(500).json({ success: false, message: 'Lỗi hệ thống. Vui lòng thử lại.' });
}
