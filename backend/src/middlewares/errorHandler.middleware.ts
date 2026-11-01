import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/app-error';
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const bodyErrorType = (err as Error & { type?: string }).type;
  if (bodyErrorType === 'entity.too.large') { res.status(413).json({ success: false, message: 'Nội dung yêu cầu vượt giới hạn cho phép.' }); return; }
  if (bodyErrorType === 'encoding.unsupported' || bodyErrorType === 'charset.unsupported') { res.status(415).json({ success: false, message: 'Kiểu mã hóa nội dung không được hỗ trợ.' }); return; }
  if (bodyErrorType === 'request.aborted' || bodyErrorType === 'request.size.invalid') { res.status(400).json({ success: false, message: 'Nội dung yêu cầu không hợp lệ.' }); return; }
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
