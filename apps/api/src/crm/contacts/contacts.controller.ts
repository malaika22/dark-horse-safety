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
import { ExportQueryDto } from '../../common/dto/list-query.dto';
import { ContactsService } from './contacts.service';
import {
  BulkContactIdsDto,
  ContactListQueryDto,
  CreateContactDto,
  SetPrimaryContactDto,
  UpdateContactDto,
} from './dto/contact.dto';

@ApiTags('crm-contacts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts' })
  list(@Query() query: ContactListQueryDto) {
    return this.contacts.list(query);
  }

  @Get('kpi')
  @ApiOperation({ summary: 'Contact list KPI strip' })
  kpi() {
    return this.contacts.kpi();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export contacts CSV' })
  export(@Query() query: ExportQueryDto & ContactListQueryDto) {
    return this.contacts.exportCsv(query);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive contacts' })
  bulkArchive(@Body() dto: BulkContactIdsDto) {
    return this.contacts.bulkArchive(dto.ids);
  }

  @Post()
  @ApiOperation({ summary: 'Create contact' })
  create(@Body() dto: CreateContactDto) {
    return this.contacts.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Contact detail' })
  get(@Param('id') id: string) {
    return this.contacts.getById(id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Contact activity history' })
  listActivities(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contacts.listActivities(id, {
      type,
      from,
      to,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id/quotes')
  @ApiOperation({ summary: 'Quotes where contact is named recipient' })
  listQuotes(@Param('id') id: string) {
    return this.contacts.listQuotes(id);
  }

  @Get(':id/work-orders')
  @ApiOperation({ summary: 'Work orders at contact-linked customer sites' })
  listWorkOrders(@Param('id') id: string) {
    return this.contacts.listWorkOrders(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact' })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive contact' })
  archive(@Param('id') id: string) {
    return this.contacts.archive(id);
  }

  @Post(':id/set-primary')
  @ApiOperation({ summary: 'Set contact as primary for a customer' })
  setPrimary(@Param('id') id: string, @Body() dto: SetPrimaryContactDto) {
    return this.contacts.setPrimary(id, dto.customerId);
  }
}
