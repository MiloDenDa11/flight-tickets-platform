import { prisma } from '../config/db';
export const publicUser = { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true } as const;
export const userRepository = {
  byEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  byId: (id: number) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUser }),
  create: (fullName: string, email: string, passwordHash: string) => prisma.user.create({ data: { fullName, email, passwordHash } }),
};
