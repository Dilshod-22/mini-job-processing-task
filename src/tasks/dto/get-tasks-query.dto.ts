import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../task.entity';

export class GetTasksQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based index)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Page size (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'email', description: 'Filter by task type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    example: '2026-01-01T00:00:00Z',
    description: 'Filter tasks created from this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59Z',
    description: 'Filter tasks created until this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

