import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { loginSchema, registerSchema, password } from '../validators';
import { env } from '../config/env';
import { z } from 'zod';
const cookie = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api/v1/auth', maxAge: 7 * 86400000 };
function respond(res: Response, result: Awaited<ReturnType<typeof authService.login>>) {
  const { refreshToken, ...data } = result;
  res.cookie('flight_refresh', refreshToken, cookie).json({ success: true, data });
}
export const authController = {
  async register(req: Request, res: Response) { respond(res, await authService.register(registerSchema.parse(req.body))); },
  async login(req: Request, res: Response) { const v = loginSchema.parse(req.body); respond(res, await authService.login(v.email, v.password)); },
  async refresh(req: Request, res: Response) { respond(res, await authService.refresh(z.string().min(1).parse(req.cookies?.flight_refresh))); },
  async logout(req: Request, res: Response) { await authService.logout(req.cookies?.flight_refresh); res.clearCookie('flight_refresh', { ...cookie, maxAge: undefined }).json({ success: true }); },
  async forgot(req: Request, res: Response) { const { email } = loginSchema.pick({ email: true }).parse(req.body); await authService.forgot(email); res.json({ success: true, message: 'Nếu tài khoản tồn tại, email khôi phục sẽ được gửi.' }); },
  async reset(req: Request, res: Response) { const v = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password }).parse(req.body); await authService.reset(v.token, v.password); res.json({ success: true }); },
};
