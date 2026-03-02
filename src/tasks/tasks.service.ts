import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { MockService } from '../mock/mock.service';
import { Task, TaskStatus, TaskPriority } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';

@Injectable()
export class TasksService {
  private readonly queue: Queue;

  constructor(
    private readonly mockService: MockService,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {
    this.queue = new Queue('tasks', {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: +(process.env.REDIS_PORT ?? 6379),
      },
    });
  }

  async createTask(userId: string, dto: CreateTaskDto): Promise<Task> {
    if (dto.idempotency_key) {
      const existing = await this.tasksRepository.findOne({
        where: { user_id: userId, idempotency_key: dto.idempotency_key },
      });
      if (existing) {
        return existing;
      }
    }

    const scheduledAt = dto.scheduled_at ? new Date(dto.scheduled_at) : null;

    const task = this.tasksRepository.create({
      user_id: userId,
      type: dto.type,
      priority: dto.priority ?? TaskPriority.NORMAL,
      payload: dto.payload,
      status: TaskStatus.PENDING,
      idempotency_key: dto.idempotency_key ?? null,
      scheduled_at: scheduledAt,
      attempts: 0,
    });

    let saved: Task;

    try {
      saved = await this.tasksRepository.save(task);
    } catch (error) {
      // DB-level idempotency guard (unique constraint)
      if (error instanceof QueryFailedError) {
        const code = (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code;
        if (code === '23505' && dto.idempotency_key) {
          const existing = await this.tasksRepository.findOne({
            where: { user_id: userId, idempotency_key: dto.idempotency_key },
          });
          if (existing) {
            return existing;
          }
        }
      }
      throw error;
    }

    const baseJobOptions = {
      removeOnComplete: true,
      removeOnFail: false,
      jobId: saved.id,
      // 1 ta asosiy urinish + 3 ta retry = 4 attempts
      attempts: 4,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
    };

    if (scheduledAt && scheduledAt.getTime() > Date.now()) {
      const delay = scheduledAt.getTime() - Date.now();
      await this.queue.add('process-task', { taskId: saved.id }, { ...baseJobOptions, delay });
    } else {
      await this.queue.add('process-task', { taskId: saved.id }, baseJobOptions);
    }

    return this.tasksRepository.findOneOrFail({ where: { id: saved.id } });
  }

  async getTasks(userId: string, query: GetTasksQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.tasksRepository.createQueryBuilder('task').where('task.user_id = :userId', {
      userId,
    });

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('task.type = :type', { type: query.type });
    }

    if (query.from) {
      qb.andWhere('task.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('task.created_at <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('task.created_at', 'DESC').take(limit).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async getAllTasks(query: GetTasksQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const qb = this.tasksRepository.createQueryBuilder('task');

    if (query.status) {
      qb.where('task.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('task.type = :type', { type: query.type });
    }

    if (query.from) {
      qb.andWhere('task.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('task.created_at <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('task.created_at', 'DESC').take(limit).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async cancelTask(userId: string, id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only PENDING tasks can be cancelled');
    }

    task.status = TaskStatus.CANCELLED;

    const saved = await this.tasksRepository.save(task);

    const job = await this.queue.getJob(task.id);
    if (job) {
      await job.remove();
    }

    return saved;
  }

  async adminCancelTask(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only PENDING tasks can be cancelled');
    }

    task.status = TaskStatus.CANCELLED;

    const saved = await this.tasksRepository.save(task);

    const job = await this.queue.getJob(task.id);
    if (job) {
      await job.remove();
    }

    return saved;
  }

  async processTaskById(taskId: string): Promise<void> {
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return;
    }

    task.status = TaskStatus.PROCESSING;
    task.started_at = new Date();
    task.attempts = task.attempts + 1;
    await this.tasksRepository.save(task);

    try {
      await this.mockService.processTask(task.payload);
      task.status = TaskStatus.COMPLETED;
      task.completed_at = new Date();
      task.last_error = null;
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.completed_at = new Date();
      task.last_error = (error as Error).message;
    }

    await this.tasksRepository.save(task);
  }

  async retryFailedTask(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.FAILED) {
      throw new BadRequestException('Only FAILED tasks can be retried');
    }

    task.status = TaskStatus.PENDING;
    task.started_at = null;
    task.completed_at = null;
    task.last_error = null;
    // attempts ni reset qilmaymiz - umumiy urinishlar sonini saqlash uchun

    const saved = await this.tasksRepository.save(task);

    const baseJobOptions = {
      removeOnComplete: true,
      removeOnFail: false,
      jobId: saved.id,
      attempts: 4,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
    };

    await this.queue.add('process-task', { taskId: saved.id }, baseJobOptions);

    return saved;
  }

  async getMetrics() {
    const total = await this.tasksRepository.count();

    const byStatus = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const byType = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.type')
      .getRawMany();

    // Calculate average processing time in milliseconds
    // Processing time = completed_at - started_at for COMPLETED tasks
    const avgResult = await this.tasksRepository
      .createQueryBuilder('task')
      .select('AVG(EXTRACT(EPOCH FROM (task.completed_at - task.started_at)) * 1000)', 'avgProcessingTimeMs')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.started_at IS NOT NULL')
      .andWhere('task.completed_at IS NOT NULL')
      .getRawOne();

    const avgProcessingTimeMs = avgResult?.avgProcessingTimeMs
      ? Math.round(parseFloat(avgResult.avgProcessingTimeMs))
      : null;

    return {
      total,
      byStatus,
      byType,
      avgProcessingTimeMs,
    };
  }
}

