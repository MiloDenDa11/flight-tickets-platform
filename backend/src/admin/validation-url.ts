import { z } from "zod";
// Kept independent from query validation to avoid a circular import with shared validators.
export const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return (
        /^\/brands\/[a-zA-Z0-9/_.-]+$/.test(value) ||
        /^\/api\/v1\/media\/airline-logos\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(
          value,
        )
      );
    }
  }, "Dùng URL HTTPS hoặc logo được tải lên trong hệ thống");
