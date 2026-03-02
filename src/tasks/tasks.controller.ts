import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { PaginatedTasksDto, TaskDto } from './dto/task.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOkResponse({ type: TaskDto })
  async createTask(@Req() req: AuthenticatedRequest, @Body() body: CreateTaskDto): Promise<TaskDto> {
    const userId = req.user?.userId;
    return this.tasksService.createTask(userId as string, body);
  }

  @Get()
  @ApiOkResponse({ type: PaginatedTasksDto })
  async getTasks(@Req() req: AuthenticatedRequest, @Query() query: GetTasksQueryDto): Promise<PaginatedTasksDto> {
    const userId = req.user?.userId;
    return this.tasksService.getTasks(userId as string, query);
  }

  @Post(':id/cancel')
  @ApiOkResponse({ type: TaskDto })
  async cancelTask(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<TaskDto> {
    const userId = req.user?.userId;
    return this.tasksService.cancelTask(userId as string, id);
  }
}

