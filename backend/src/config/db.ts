import { PrismaClient } from '@prisma/client';
// Prisma SQL errors can include bound values or passenger rows. The HTTP boundary logs sanitized names only.
export const prisma = new PrismaClient({ log: [] });
