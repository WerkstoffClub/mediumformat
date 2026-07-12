import {
  Controller, Post, Get, Put, Body, Param, Query, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import pdfParse from 'pdf-parse';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { ImportsService } from './imports.service';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportFilterDto } from './dto/import-filter.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateChannelPricingDto } from './dto/update-channel-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, STAFF_ROLES } from '@mf/shared';
import { SalesChannel } from '@prisma/client';

// Invoices/attachments are small PDFs and images; bound in-memory buffering.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** Minimal response surface needed to stream a file back manually,
 *  mirrors the CsvResponse pattern used in finance.controller.ts. */
interface FileResponse {
  setHeader(name: string, value: string): void;
  end(chunk?: Buffer): void;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(
    private parser: InvoiceParserService,
    private imports: ImportsService,
  ) {}

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

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query() filter: ImportFilterDto) {
    return this.imports.findAll(filter);
  }

  @Roles(...STAFF_ROLES)
  @Get('channel-pricing')
  listChannelPricing() {
    return this.imports.listChannelPricing();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Put('channel-pricing/:channel')
  updateChannelPricing(@Param('channel') channel: SalesChannel, @Body() body: UpdateChannelPricingDto) {
    return this.imports.updateChannelPricing(channel, body);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.imports.findOne(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  create(@Body() body: CreateImportDto) {
    return this.imports.create(body);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/price')
  price(@Param('id') id: string) {
    return this.imports.price(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/match')
  match(@Param('id') id: string) {
    return this.imports.match(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/commit')
  commit(@Param('id') id: string) {
    return this.imports.commit(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadAttachment(
    @Param('id') id: string,
    @Body() body: CreateAttachmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (field name: "file")');
    return this.imports.addAttachment(id, body.kind, file);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id/attachments/:attId')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @Res() res: FileResponse,
  ) {
    const { buffer, mimeType } = await this.imports.getAttachmentFile(id, attId);
    res.setHeader('Content-Type', mimeType);
    res.end(buffer);
  }
}
