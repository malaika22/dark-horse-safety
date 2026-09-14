import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUploadDto {
  @ApiProperty({
    description:
      'Relative folder under uploads root, e.g. locations/draft or customers/{id}',
    example: 'locations/draft',
  })
  @IsString()
  @IsNotEmpty({ message: 'Enter an upload folder.' })
  @MaxLength(200)
  folder!: string;

  @ApiProperty({ example: 'main-gate.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'Enter a file name.' })
  @MaxLength(200)
  fileName!: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: 'Raw base64 or data URL (data:image/jpeg;base64,...)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Upload file content.' })
  contentBase64!: string;
}
