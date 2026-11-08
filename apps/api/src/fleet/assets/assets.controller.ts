import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { AssetsService } from './assets.service';

class SaveAssetDto {
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(80) serial?: string;
  @IsOptional() @IsString() @MaxLength(80) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(80) model?: string;
  @IsOptional() @IsString() @MaxLength(80) home?: string;
  @IsOptional() @IsString() @MaxLength(80) technician?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsNumber() replacementValue?: number | null;
  @IsOptional() @IsString() @MaxLength(40) purchaseDate?: string;
  @IsOptional() @IsString() @MaxLength(80) purchaseOrder?: string;
  @IsOptional() @IsString() @MaxLength(120) vendor?: string;
  @IsOptional() @IsString() @MaxLength(40) warrantyExpires?: string;
  @IsOptional() @IsString() @MaxLength(80) rentalAgreement?: string;
  @IsOptional() @IsString() @MaxLength(120) rentalVendor?: string;
  @IsOptional() @IsNumber() dailyRate?: number | null;
  @IsOptional() @IsString() @MaxLength(40) rentalStart?: string;
  @IsOptional() @IsString() @MaxLength(40) contractedReturn?: string;
  @IsOptional() @IsNumber() quantity?: number | null;
  @IsOptional() @IsNumber() minimum?: number | null;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsNumber() unitCost?: number | null;
  @IsOptional() @IsString() @MaxLength(120) preferredVendor?: string;
  @IsOptional() @IsString() @MaxLength(80) lastPurchaseOrder?: string;
  @IsOptional() @IsString() @MaxLength(40) condition?: string;
  @IsOptional() @IsString() @MaxLength(40) sizeClass?: string;
  @IsOptional() @IsString() @MaxLength(120) agent?: string;
  @IsOptional() @IsArray() clocks?: Array<Record<string, string>>;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsArray() documents?: Array<Record<string, string>>;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MaxLength(80) checkedOutTo?: string;
  @IsOptional() @IsString() @MaxLength(40) assetCode?: string;
  @IsOptional() @IsString() @MaxLength(8) calibrationRequired?: string;
  @IsOptional() @IsString() @MaxLength(40) calibrationDate?: string;
  @IsOptional() @IsString() @MaxLength(40) calibrationInterval?: string;
  @IsOptional() @IsString() @MaxLength(40) nextCalibrationDue?: string;
  @IsOptional() @IsString() @MaxLength(40) bumpTestDate?: string;
  @IsOptional() @IsString() @MaxLength(20) bumpResult?: string;
  @IsOptional() @IsArray() sensors?: Array<Record<string, string>>;
  @IsOptional() @IsString() @MaxLength(40) cylinderSize?: string;
  @IsOptional() @IsString() @MaxLength(80) cylinderMaterial?: string;
}

class BulkAssetDto {
  @IsArray()
  @IsString({ each: true })
  codes!: string[];

  @IsString()
  @MaxLength(40)
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  to?: string;
}

class CheckoutAssetDto {
  @IsString()
  @MaxLength(80)
  technician!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  due?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;
}

class AssetNoteDto {
  @IsString()
  @MaxLength(500)
  text!: string;
}

class MoveAssetDto {
  @IsString() @MaxLength(80) to!: string;
  @IsString() @MaxLength(80) reason!: string;
  @IsOptional() @IsString() @MaxLength(80) newParentTruck?: string;
  @IsOptional() @IsString() @MaxLength(80) checkedOutTo?: string;
  @IsOptional() @IsString() @MaxLength(80) movedBy?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

class UndoMoveDto {
  @IsString() @MaxLength(80) from!: string;
  @IsString() @MaxLength(80) to!: string;
}

@ApiTags('fleet-assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet/assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Asset register built from inspections, calibrations, repairs, and missing items' })
  list() {
    return this.service.list();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Assets with an open exception' })
  readiness() {
    return this.service.readiness();
  }

  @Post()
  @ApiOperation({ summary: 'Create an asset profile and, when it is not a consumable, a calibration row' })
  create(@Body() body: SaveAssetDto) {
    return this.service.create(body as Parameters<AssetsService["create"]>[0]);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Move, assign, or mark selected assets out of service' })
  bulk(@Body() body: BulkAssetDto) {
    return this.service.bulk(body.codes, body.action, body.to);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Asset profile for edit and move' })
  detail(@Param('code') code: string) {
    return this.service.detail(code);
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Save asset identity, stock, rental terms, clocks, documents, and home' })
  save(@Param('code') code: string, @Body() body: SaveAssetDto) {
    return this.service.save(code, body as Parameters<AssetsService["save"]>[1]);
  }

  @Post(':code/move')
  @ApiOperation({ summary: 'Move an asset to a truck or location' })
  move(@Param('code') code: string, @Body() body: MoveAssetDto) {
    return this.service.move(code, body);
  }

  @Post(':code/checkout')
  checkout(@Param('code') code: string, @Body() body: CheckoutAssetDto) {
    return this.service.checkout(code, body.technician, body.due, body.reference);
  }

  @Post(':code/check-in')
  checkIn(@Param('code') code: string) {
    return this.service.checkIn(code);
  }

  @Post(':code/retire')
  retire(@Param('code') code: string) {
    return this.service.retire(code);
  }

  @Post(':code/notes')
  note(@Param('code') code: string, @Body() body: AssetNoteDto) {
    return this.service.addNote(code, body.text);
  }

  @Post(':code/move/undo')
  @ApiOperation({ summary: 'Return an asset to the location it moved from' })
  undo(@Param('code') code: string, @Body() body: UndoMoveDto) {
    return this.service.undoMove(code, body.from, body.to);
  }
}
