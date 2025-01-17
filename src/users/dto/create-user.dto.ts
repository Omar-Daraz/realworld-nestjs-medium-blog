import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  // decorators here
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

import { FileDto } from '@src/files/dto/file.dto';
import { RoleDto } from '@src/roles/dto/role.dto';
import { StatusDto } from '@src/statuses/dto/status.dto';
import { lowerCaseTransformer } from '@src/utils/transformers/lower-case.transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @MinLength(6)
  password?: string;

  provider?: string;

  social_id?: string | null;

  @ApiProperty({ example: 'John', type: String })
  @IsNotEmpty()
  first_name: string | null;

  @ApiProperty({ example: 'Doe', type: String })
  @IsNotEmpty()
  last_name: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({ type: StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  hash?: string | null;
}
