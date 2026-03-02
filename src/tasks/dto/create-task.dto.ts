import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { TaskPriority } from '../task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'email', description: 'Task type, e.g. email or report' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.NORMAL,
    description: 'Priority of the task: high, normal, or low',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { to: 'user@example.com', subject: 'Hi' },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'signup-email-123',
    description: 'Idempotency key to prevent creating duplicate tasks for the same user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotency_key?: string;

  @ApiPropertyOptional({
    example: '2026-03-01T12:00:00Z',
    description: 'Optional future datetime when the task should be processed (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

