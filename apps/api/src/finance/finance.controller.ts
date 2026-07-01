import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';

interface CsvResponse {
  setHeader(name: string, value: string): void;
  send(body: string): void;
}
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@mf/shared';
import { FinanceService, toCsv } from './finance.service';
import {
  ExportQueryDto,
  FinanceQueryDto,
  MarginsQueryDto,
  TimeseriesQueryDto,
} from './dto/finance-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('finance')
export class FinanceController {
  constructor(private finance: FinanceService) {}

  @Get('summary')
  summary(@Query() q: FinanceQueryDto) {
    return this.finance.summary(q);
  }

  @Get('timeseries')
  timeseries(@Query() q: TimeseriesQueryDto) {
    return this.finance.timeseries(q, q.granularity ?? 'day');
  }

  @Get('payments')
  payments(@Query() q: FinanceQueryDto) {
    return this.finance.payments(q);
  }

  @Get('margins')
  margins(@Query() q: MarginsQueryDto) {
    return this.finance.margins(q, q.groupBy ?? 'release');
  }

  @Get('filters')
  filters() {
    return this.finance.filterOptions();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Query() q: ExportQueryDto, @Res() res: CsvResponse) {
    const rows =
      q.report === 'summary' ? [await this.finance.summary(q)]
      : q.report === 'timeseries' ? await this.finance.timeseries(q, q.granularity ?? 'day')
      : q.report === 'payments' ? await this.finance.payments(q)
      : await this.finance.margins(q, q.groupBy ?? 'release');
    const filename = `finance-${q.report}-${q.from}-to-${q.to}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(rows));
  }
}
