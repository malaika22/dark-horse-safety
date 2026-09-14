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
  CreatePaymentCardDto,
  UpdatePaymentCardDto,
} from './dto/payment-card.dto';
import { PaymentCardsService } from './payment-cards.service';

@ApiTags('crm-payment-cards')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/payment-cards')
export class PaymentCardsController {
  constructor(private readonly cards: PaymentCardsService) {}

  @Get()
  @ApiOperation({ summary: 'List payment cards' })
  list(@Query('activeOnly') activeOnly?: string) {
    return this.cards.list(activeOnly !== 'false');
  }

  @Post()
  @ApiOperation({ summary: 'Create payment card' })
  create(@Body() dto: CreatePaymentCardDto) {
    return this.cards.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment card' })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentCardDto) {
    return this.cards.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive payment card' })
  archive(@Param('id') id: string) {
    return this.cards.archive(id);
  }
}
