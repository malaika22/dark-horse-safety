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
  CreateExpenseDto,
  ExpenseListQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('crm-expenses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  list(@Query() query: ExpenseListQueryDto) {
    return this.expenses.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Expense detail' })
  get(@Param('id') id: string) {
    return this.expenses.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenses.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive expense' })
  archive(@Param('id') id: string) {
    return this.expenses.archive(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve expense' })
  approve(@Param('id') id: string) {
    return this.expenses.approve(id);
  }

  @Post(':id/flag-for-review')
  @ApiOperation({ summary: 'Flag expense for manager review' })
  flagForReview(@Param('id') id: string) {
    return this.expenses.flagForReview(id);
  }
}

@ApiTags('crm-customer-expenses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/customers')
export class CustomerExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get(':id/expenses')
  @ApiOperation({ summary: 'List expenses for a customer' })
  listForCustomer(
    @Param('id') id: string,
    @Query() query: ExpenseListQueryDto,
  ) {
    return this.expenses.listForCustomer(id, query);
  }
}
