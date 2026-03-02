import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed', description: 'Error message' })
  message: string;

  @ApiProperty({ example: 'Bad Request', description: 'Error type' })
  error: string;

  @ApiProperty({ example: '2026-03-02T10:30:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/tasks', description: 'Request path' })
  path: string;
}
