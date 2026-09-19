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
  CreateOnCallSwapDto,
  GenerateOnCallDto,
  OnCallMonthQueryDto,
  UpdateOnCallAssignmentDto,
} from './dto/on-call.dto';
import { OnCallService } from './on-call.service';

@ApiTags('hr-on-call')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/on-call')
export class OnCallController {
  constructor(private readonly service: OnCallService) {}

  @Get()
  @ApiOperation({ summary: 'On-call month dashboard' })
  month(@Query() query: OnCallMonthQueryDto) {
    return this.service.getMonth(query);
  }

  @Get('pool')
  @ApiOperation({ summary: 'Eligible technicians & certifications' })
  pool() {
    return this.service.poolOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get on-call assignment' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update on-call assignment' })
  update(@Param('id') id: string, @Body() dto: UpdateOnCallAssignmentDto) {
    return this.service.update(id, dto);
  }

  @Post('swaps')
  @ApiOperation({ summary: 'Submit swap request' })
  swap(@Body() dto: CreateOnCallSwapDto) {
    return this.service.createSwap(dto);
  }

  @Post('generate/preview')
  @ApiOperation({ summary: 'Preview generated rotation' })
  preview(@Body() dto: GenerateOnCallDto) {
    return this.service.previewGenerate(dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Create generated rotation assignments' })
  generate(@Body() dto: GenerateOnCallDto) {
    return this.service.generate(dto);
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish month to mobile' })
  publish(@Query() query: OnCallMonthQueryDto) {
    return this.service.publish(query.year, query.month);
  }
}
