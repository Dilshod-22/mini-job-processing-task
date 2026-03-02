import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { MetricsDto } from './metrics.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

@ApiTags('metrics')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('metrics')
  @ApiOkResponse({ type: MetricsDto })
  async getMetrics(@Req() req: AuthenticatedRequest): Promise<MetricsDto> {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admins only');
    }

    return this.tasksService.getMetrics();
  }
}

