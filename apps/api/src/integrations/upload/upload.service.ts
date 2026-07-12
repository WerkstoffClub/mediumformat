import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/mp3',
]);
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class UploadService {
  private readonly root = path.join(process.cwd(), 'uploads');

  ensureRoot(): void {
    if (!fs.existsSync(this.root)) fs.mkdirSync(this.root, { recursive: true });
  }

  saveAudio(file: Express.Multer.File): { url: string } {
    if (!AUDIO_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported audio type: ${file.mimetype}`);
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 20MB)');
    }
    this.ensureRoot();
    const ext = file.originalname.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp3';
    const name = `audio-${crypto.randomUUID()}${ext.toLowerCase()}`;
    fs.writeFileSync(path.join(this.root, name), file.buffer);
    return { url: `/uploads/${name}` };
  }

  saveRemoteImage(
    bytes: Buffer,
    mime: string,
    hint = 'image',
  ): { url: string } {
    if (!IMAGE_MIME.has(mime)) {
      throw new BadRequestException(`Unsupported image type: ${mime}`);
    }
    this.ensureRoot();
    const ext =
      mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
    const name = `${hint}-${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(this.root, name), bytes);
    return { url: `/uploads/${name}` };
  }
}
