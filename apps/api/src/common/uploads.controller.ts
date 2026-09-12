import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CreateUploadDto } from './dto/upload.dto';
import { UploadsService } from './services/uploads.service';

@ApiTags('crm-uploads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('crm/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a file to local storage and return a public /uploads URL',
  })
  async create(@Body() dto: CreateUploadDto) {
    const saved = await this.uploads.saveBase64({
      folder: dto.folder,
      fileName: dto.fileName,
      contentBase64: dto.contentBase64,
    });
    return {
      data: {
        ...saved,
        mimeType: dto.mimeType ?? null,
      },
    };
  }
}
