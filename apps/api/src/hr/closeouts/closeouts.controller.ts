import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { CloseoutDecisionDto } from './dto/closeout.dto';
import { CloseoutsService } from './closeouts.service';

@ApiTags('hr-closeouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/closeouts')
export class CloseoutsController {
  constructor(private readonly service: CloseoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Closeout review overview (KPIs + pending list)' })
  overview() {
    return this.service.overview();
  }

  @Post('refresh-flags')
  @ApiOperation({ summary: 'Recompute auto-flags on pending closeouts' })
  refreshFlags() {
    return this.service.refreshFlags();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Closeout detail packet' })
  one(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Accept, return, or hold closeout' })
  decide(
    @Param('id') id: string,
    @Body() dto: CloseoutDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.decide(id, dto, user);
  }
}
