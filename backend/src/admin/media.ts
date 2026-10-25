import { Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "../utils/app-error";
import { audit } from "./data";
export const logoDirectory = path.resolve(process.cwd(), "uploads", "airlines");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
}).single("logo");
export async function uploadLogo(req: Request, res: Response) {
  await new Promise<void>((resolve, reject) =>
    upload(req, res, (error) =>
      error
        ? reject(
            new AppError(
              "Chỉ tải một ảnh PNG, JPEG hoặc WebP tối đa 2 MB.",
              422,
            ),
          )
        : resolve(),
    ),
  );
  const file = req.file;
  if (!file) throw new AppError("Chọn ảnh logo.", 422);
  const data = file.buffer;
  const extension =
    data.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      ? "png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "jpg"
        : data.subarray(0, 4).toString() === "RIFF" &&
            data.subarray(8, 12).toString() === "WEBP"
          ? "webp"
          : null;
  if (!extension)
    throw new AppError(
      "Định dạng ảnh không hợp lệ. Không nhận SVG hoặc tệp thực thi.",
      422,
    );
  if (
    extension === "png" &&
    (data.length < 24 ||
      data.readUInt32BE(16) > 4096 ||
      data.readUInt32BE(20) > 4096)
  )
    throw new AppError("Kích thước ảnh tối đa 4096 × 4096.", 422);
  const name =
    createHash("sha256").update(data).digest("hex") + "." + extension;
  await mkdir(logoDirectory, { recursive: true });
  await writeFile(path.join(logoDirectory, name), data);
  await audit(req.auth!.id, "AIRLINE_LOGO_UPLOADED", "AirlineLogo", name, {
    bytes: data.length,
    format: extension,
  });
  res
    .status(201)
    .json({
      success: true,
      data: { url: "/api/v1/media/airline-logos/" + name },
    });
}
export function serveLogo(req: Request, res: Response) {
  const name = String(req.params.filename);
  if (!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(name))
    throw new AppError("Không tìm thấy logo", 404);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(name, { root: logoDirectory }, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
}
