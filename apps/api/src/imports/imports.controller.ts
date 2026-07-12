import {
  Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import pdfParse from 'pdf-parse';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';

// Invoices are small PDFs; bound in-memory buffering + downstream LLM cost.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private parser: InvoiceParserService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('parse')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async parse(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded (field name: "file")');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF invoices are supported');
    const { text } = await pdfParse(file.buffer);
    if (!text?.trim()) throw new BadRequestException('Could not extract text from the PDF (is it scanned?)');
    return this.parser.parse(text);
  }
}
