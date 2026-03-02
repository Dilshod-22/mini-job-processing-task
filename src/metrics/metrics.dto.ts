import { ApiProperty } from '@nestjs/swagger';

export class MetricsCountByStatusDto {
  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: 42 })
  count: string;
}

export class MetricsCountByTypeDto {
  @ApiProperty({ example: 'email' })
  type: string;

  @ApiProperty({ example: 10 })
  count: string;
}

export class MetricsDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ type: () => [MetricsCountByStatusDto] })
  byStatus: MetricsCountByStatusDto[];

  @ApiProperty({ type: () => [MetricsCountByTypeDto] })
  byType: MetricsCountByTypeDto[];

  @ApiProperty({
    example: 3500,
    description: 'Average processing time in milliseconds for completed tasks',
    nullable: true,
  })
  avgProcessingTimeMs: number | null;
}

