import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";

import config from "../../config/env";
import { asyncHandler } from "../../lib/async-handler";
import { badRequest } from "../../lib/errors";

export const UPLOAD_DIR = path.join(__dirname, "..", "..", "..", "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    callback(null, `${unique}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(badRequest("Only image files can be uploaded") as any);
      return;
    }
    callback(null, true);
  },
});

/**
 * POST /api/upload/image  (multipart/form-data, field name: `image`)
 * -> { success, imgUrl }
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest("No image was uploaded");

  const host =
    config.publicUrl || `${req.protocol}://${req.get("host") ?? `localhost:${config.port}`}`;

  res.json({
    success: true,
    message: "Image uploaded",
    imgUrl: `${host}/uploads/${req.file.filename}`,
  });
});

/** Attachments may be any document/media file (chat sends them as links). */
const uploadAttachment = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const blocked = /^(application\/x-msdownload|application\/x-executable|application\/x-sh)$/i;
    if (blocked.test(file.mimetype)) {
      callback(badRequest("This file type cannot be uploaded") as any);
      return;
    }
    callback(null, true);
  },
});

/**
 * POST /api/upload/file   (multipart/form-data, field name: `file`)
 * -> { success, file: { url, name, type, size } }
 * Used by chat attachments; the URL is then referenced from the message.
 */
export const uploadChatFile = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest("No file was uploaded");

  const host =
    config.publicUrl || `${req.protocol}://${req.get("host") ?? `localhost:${config.port}`}`;

  res.json({
    success: true,
    message: "File uploaded",
    file: {
      url: `${host}/uploads/${req.file.filename}`,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    },
  });
});

export const uploadRouter = Router();

uploadRouter.post("/image", upload.single("image"), uploadImage);
uploadRouter.post("/file", uploadAttachment.single("file"), uploadChatFile);

export default uploadRouter;
