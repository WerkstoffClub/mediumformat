import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { InvoiceParserService } from './parsing/invoice-parser.service';
import { INVOICE_PARSER_PROVIDER } from './parsing/invoice-parser.provider';
import { OpenRouterInvoiceParser } from './parsing/openrouter-invoice-parser.provider';
import { FxService } from './pricing/fx.service';
import { MatchService } from './matching/match.service';
import { DiscogsService } from './matching/discogs.service';
import { ConsolidationsController } from './consolidation/consolidations.controller';
import { ConsolidationsService } from './consolidation/consolidations.service';

@Module({
  controllers: [ImportsController, ConsolidationsController],
  providers: [
    ImportsService,
    InvoiceParserService,
    FxService,
    MatchService,
    DiscogsService,
    ConsolidationsService,
    { provide: INVOICE_PARSER_PROVIDER, useClass: OpenRouterInvoiceParser },
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
