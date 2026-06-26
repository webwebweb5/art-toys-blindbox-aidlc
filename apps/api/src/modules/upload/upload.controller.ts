import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { JwtAuthGuard } from '../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../account/auth/guards/roles.guard';
import { Roles } from '../account/auth/decorators/roles.decorator';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  @Post()
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException({
              code: 'INVALID_FILE_TYPE',
              message: 'Only image files are allowed',
            }),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'No file uploaded',
      });
    }
    const base = `${req.protocol}://${req.get('host')}`;
    return {
      url: `${base}/uploads/${file.filename}`,
      filename: file.filename,
    };
  }
}
