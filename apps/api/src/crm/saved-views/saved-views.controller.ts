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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  CreateSavedViewDto,
  SavedViewListQueryDto,
  UpdateSavedViewDto,
} from './dto/saved-view.dto';
import { SavedViewsService } from './saved-views.service';

@ApiTags('crm-saved-views')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/saved-views')
export class SavedViewsController {
  constructor(private readonly savedViews: SavedViewsService) {}

  @Get()
  @ApiOperation({ summary: 'List saved views for current user' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: SavedViewListQueryDto,
  ) {
    return this.savedViews.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create saved view' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedViewDto) {
    return this.savedViews.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update saved view' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSavedViewDto,
  ) {
    return this.savedViews.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete saved view' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.savedViews.remove(user.id, id);
  }
}
