import { Controller, Get, Param, Post, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { PaginatedTasksDto, TaskDto } from './dto/task.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

@ApiTags('admin-tasks')
@ApiBearerAuth()
@Controller('admin/tasks')
@UseGuards(JwtAuthGuard)
export class AdminTasksController {
  constructor(private readonly tasksService: TasksService) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admins only');
    }
  }

  @Get()
  @ApiOkResponse({ type: PaginatedTasksDto })
  async getAllTasks(@Req() req: AuthenticatedRequest, @Query() query: GetTasksQueryDto): Promise<PaginatedTasksDto> {
    this.ensureAdmin(req);
    return this.tasksService.getAllTasks(query);
  }

  @Post(':id/retry')
  @ApiOkResponse({ type: TaskDto })
  async retryTask(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<TaskDto> {
    this.ensureAdmin(req);
    return this.tasksService.retryFailedTask(id);
  }

  @Post(':id/cancel')
  @ApiOkResponse({ type: TaskDto })
  async cancelTask(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<TaskDto> {
    this.ensureAdmin(req);
    return this.tasksService.adminCancelTask(id);
  }
}

