import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { SaveInvoiceDto, SendInvoiceDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('operations-invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get(':id/preview')
  @ApiOperation({ summary: 'Invoice preview packet from sales ticket' })
  preview(@Param('id') id: string) {
    return this.service.preview(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Save invoice notes / NetSuite ref' })
  save(@Param('id') id: string, @Body() dto: SaveInvoiceDto) {
    return this.service.save(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice email (success or delivery failed)' })
  send(@Param('id') id: string, @Body() dto: SendInvoiceDto) {
    return this.service.send(id, dto);
  }
}
