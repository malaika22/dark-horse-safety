import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  AdjustSalesTicketRateDto,
  CreateSalesTicketFromWoDto,
  ReturnSalesTicketDto,
  SalesTicketListQueryDto,
  SaveSalesTicketDto,
} from './dto/sales-ticket.dto';
import { SalesTicketsService } from './sales-tickets.service';

@ApiTags('operations-sales-tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/sales-tickets')
export class SalesTicketsController {
  constructor(private readonly service: SalesTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Sales ticket review queue' })
  list(@Query() query: SalesTicketListQueryDto) {
    return this.service.list(query);
  }

  @Get('correction-fields')
  @ApiOperation({ summary: 'Correction field options' })
  correctionFields() {
    return this.service.correctionFields();
  }

  @Post('from-work-order')
  @ApiOperation({ summary: 'Create sales ticket from a work order' })
  createFromWo(@Body() dto: CreateSalesTicketFromWoDto) {
    return this.service.createFromWorkOrder(dto.workOrderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sales ticket detail packet' })
  one(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Save sales ticket / NetSuite correction fields' })
  save(
    @Param('id') id: string,
    @Body() dto: SaveSalesTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.save(id, dto, user);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept sales ticket for billing' })
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.accept(id, user);
  }

  @Post(':id/adjust-rate')
  @ApiOperation({ summary: 'Adjust submitted rate (hours locked)' })
  adjustRate(
    @Param('id') id: string,
    @Body() dto: AdjustSalesTicketRateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.adjustRate(id, dto, user);
  }

  @Post(':id/return-for-correction')
  @ApiOperation({ summary: 'Return ticket to technician for correction' })
  returnForCorrection(
    @Param('id') id: string,
    @Body() dto: ReturnSalesTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.returnForCorrection(id, dto, user);
  }
}
