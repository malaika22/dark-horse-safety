import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { ExportQueryDto } from '../../common/dto/list-query.dto';
import {
  AddQuoteAttachmentDto,
  CreateQuoteDto,
  QuoteLineItemInputDto,
  QuoteListQueryDto,
  SendQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteLineItemDto,
} from './dto/quote.dto';
import { QuotesService } from './quotes.service';

@ApiTags('crm-quotes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'List quotes' })
  list(@Query() query: QuoteListQueryDto) {
    return this.quotes.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Quotes KPI strip' })
  kpi() {
    return this.quotes.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export quotes CSV' })
  export(@Query() query: ExportQueryDto & QuoteListQueryDto) {
    return this.quotes.exportCsv(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create quote' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.create(dto);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive quotes' })
  bulkArchive(@Body() body: { ids: string[] }) {
    return this.quotes.bulkArchive(body.ids ?? []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Quote detail' })
  get(@Param('id') id: string) {
    return this.quotes.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quote' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotes.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send quote by email and mark as sent' })
  send(@Param('id') id: string, @Body() dto: SendQuoteDto) {
    return this.quotes.send(id, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate quote' })
  duplicate(@Param('id') id: string) {
    return this.quotes.duplicate(id);
  }

  @Post(':id/convert-to-work-order')
  @ApiOperation({ summary: 'Convert quote to work order' })
  convertToWorkOrder(@Param('id') id: string) {
    return this.quotes.convertToWorkOrder(id);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List quote attachments' })
  listAttachments(@Param('id') id: string) {
    return this.quotes.listAttachments(id);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add quote attachment (base64 JSON body)' })
  addAttachment(@Param('id') id: string, @Body() dto: AddQuoteAttachmentDto) {
    return this.quotes.addAttachment(id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete quote attachment' })
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.quotes.deleteAttachment(id, attachmentId);
  }

  @Post(':id/mark-won')
  @ApiOperation({ summary: 'Mark quote won' })
  markWon(@Param('id') id: string) {
    return this.quotes.markWon(id);
  }

  @Post(':id/mark-lost')
  @ApiOperation({ summary: 'Mark quote lost' })
  markLost(@Param('id') id: string) {
    return this.quotes.markLost(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive / delete draft quote' })
  archive(@Param('id') id: string) {
    return this.quotes.archive(id);
  }

  @Post(':id/line-items')
  @ApiOperation({ summary: 'Add quote line item' })
  addLineItem(@Param('id') id: string, @Body() dto: QuoteLineItemInputDto) {
    return this.quotes.addLineItem(id, dto);
  }

  @Patch(':id/line-items/:lineId')
  @ApiOperation({ summary: 'Update quote line item' })
  updateLineItem(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateQuoteLineItemDto,
  ) {
    return this.quotes.updateLineItem(id, lineId, dto);
  }

  @Delete(':id/line-items/:lineId')
  @ApiOperation({ summary: 'Delete quote line item' })
  deleteLineItem(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.quotes.deleteLineItem(id, lineId);
  }
}
