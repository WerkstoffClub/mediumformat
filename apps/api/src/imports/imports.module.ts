import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { INVOICE_PARSER_PROVIDER } from './parsing/invoice-parser.provider';
import { OpenRouterInvoiceParser } from './parsing/openrouter-invoice-parser.provider';

@Module({
  controllers: [ImportsController],
  providers: [
    InvoiceParserService,
    { provide: INVOICE_PARSER_PROVIDER, useClass: OpenRouterInvoiceParser },
  ],
})
export class ImportsModule {}
