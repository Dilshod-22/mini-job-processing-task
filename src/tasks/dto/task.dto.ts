import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../task.entity';

export class TaskDto {
  @ApiProperty({ example: 'c0b5f9b9-0c3e-4b9a-bb1e-1234567890ab' })
  id: string;

  @ApiProperty({ example: 'user-uuid-123' })
  user_id: string;

  @ApiProperty({ example: 'email' })
  type: string;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.NORMAL })
  priority: TaskPriority;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
  })
  payload: Record<string, unknown>;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional({ example: 'signup-email-123' })
  idempotency_key?: string | null;

  @ApiProperty({ example: 0, description: 'Number of processing attempts' })
  attempts: number;

  @ApiPropertyOptional({ example: '2026-03-01T12:00:00.000Z' })
  scheduled_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-01T12:00:30.000Z', description: 'When processing started' })
  started_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-03-01T12:01:00.000Z', description: 'When processing completed' })
  completed_at?: Date | null;

  @ApiPropertyOptional({ example: 'Mock processing failed' })
  last_error?: string | null;

  @ApiProperty({ example: '2026-03-01T11:59:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-03-01T12:01:00.000Z' })
  updated_at: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class PaginatedTasksDto {
  @ApiProperty({ type: () => [TaskDto] })
  data: TaskDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}

