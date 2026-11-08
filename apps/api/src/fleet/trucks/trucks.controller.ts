import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { TrucksService } from './trucks.service';

class AssignTruckDto {
  @IsString()
  @MaxLength(80)
  employeeId!: string;

  @IsString()
  @MaxLength(80)
  truckName!: string;
}

class UnassignTruckDto {
  @IsString()
  @MaxLength(80)
  truckName!: string;
}

class SaveLocationDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(40)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accessHours?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bayCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

@ApiTags('fleet-trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/trucks')
export class TrucksController {
  constructor(private readonly service: TrucksService) {}

  @Get()
  @ApiOperation({ summary: 'Truck and location cards from live fleet records' })
  overview() {
    return this.service.overview();
  }

  @Get('locations')
  listLocations() {
    return this.service.listLocations();
  }

  @Post('locations')
  createLocation(@Body() dto: SaveLocationDto) {
    return this.service.saveLocation(dto);
  }

  @Get('locations/:id')
  getLocation(@Param('id') id: string) {
    return this.service.getLocation(id);
  }

  @Patch('locations/:id')
  updateLocation(@Param('id') id: string, @Body() dto: SaveLocationDto) {
    return this.service.saveLocation(dto, id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a truck name to an employee' })
  assign(@Body() dto: AssignTruckDto) {
    return this.service.assign(dto.employeeId, dto.truckName);
  }

  @Post('unassign')
  unassign(@Body() dto: UnassignTruckDto) {
    return this.service.unassign(dto.truckName);
  }

  @Post(':id/documents')
  addDocument(
    @Param('id') id: string,
    @Body() body: { name?: string; url?: string },
  ) {
    return this.service.addDocument(id, body.name ?? 'DOCUMENT', body.url ?? '');
  }

  @Post(':id/inventory')
  addInventory(
    @Param('id') id: string,
    @Body() body: { item?: string; qty?: number; minimum?: number; sku?: string; unit?: string; preferredVendor?: string },
  ) {
    return this.service.addInventory(id, body.item ?? '', Number(body.qty ?? 0), Number(body.minimum ?? 0), body);
  }

  @Patch(':id/inventory/:itemId')
  updateInventory(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: {
      qty?: number;
      minimum?: number;
      sku?: string;
      unit?: string;
      preferredVendor?: string;
      tracked?: boolean;
      purchaseQty?: number;
    },
  ) {
    return this.service.updateInventory(id, itemId, body);
  }

  @Post(':id/inventory/:itemId/move')
  moveInventory(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { to?: string; qty?: number },
  ) {
    return this.service.moveInventory(id, itemId, body.to ?? '', Number(body.qty ?? 1));
  }

  @Post(':id/inventory/:itemId/documents')
  addInventoryDocument(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { type?: string; name?: string; url?: string },
  ) {
    return this.service.addInventoryDocument(id, itemId, { type: body.type, name: body.name ?? 'DOCUMENT', url: body.url });
  }

  @Post(':id/inventory/:itemId/issue')
  issueInventory(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: { qty?: number }) {
    return this.service.issueInventory(id, itemId, Number(body.qty ?? 1));
  }

  @Post(':id/move')
  move(
    @Param('id') id: string,
    @Body() body: { assetCode?: string; to?: string; why?: string; who?: string },
  ) {
    return this.service.moveAsset(id, body.assetCode ?? '', body.to ?? '', body.why ?? '', body.who ?? 'DISPATCH');
  }

  @Post(':id/missing')
  missing(
    @Param('id') id: string,
    @Body() body: { assetCode?: string; assetLabel?: string; value?: number; holder?: string },
  ) {
    return this.service.markMissing(
      id,
      body.assetCode ?? '',
      body.assetLabel ?? '',
      Number(body.value ?? 0),
      body.holder ?? null,
    );
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Consumable lines stored on truck and location profiles' })
  inventory() {
    return this.service.listInventory();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
