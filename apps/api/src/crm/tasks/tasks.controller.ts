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
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import {
  CreateCrmTaskDto,
  CrmTaskListQueryDto,
  UpdateCrmTaskDto,
} from './dto/crm-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('crm-tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List CRM tasks' })
  list(@Query() query: CrmTaskListQueryDto) {
    return this.tasks.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create CRM task' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCrmTaskDto) {
    return this.tasks.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Task detail' })
  get(@Param('id') id: string) {
    return this.tasks.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(@Param('id') id: string, @Body() dto: UpdateCrmTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark task complete' })
  complete(@Param('id') id: string) {
    return this.tasks.complete(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive task' })
  archive(@Param('id') id: string) {
    return this.tasks.archive(id);
  }
}
