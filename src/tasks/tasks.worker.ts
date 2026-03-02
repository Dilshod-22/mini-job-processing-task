import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './task.entity';
import { TasksService } from './tasks.service';

@Injectable()
export class TasksWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksWorker.name);
  private worker: Worker | null = null;
  private readonly redis: Redis;

  constructor(
    private readonly tasksService: TasksService,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: +(process.env.REDIS_PORT ?? 6379),
    });
  }

  onModuleInit() {
    this.worker = new Worker(
      'tasks',
      async (job: Job<{ taskId: string }>) => {
        const { taskId } = job.data;

        const task = await this.tasksRepository.findOne({ where: { id: taskId } });
        if (!task) {
          this.logger.warn(`Task ${taskId} not found, skipping job ${job.id}`);
          return;
        }

        if (task.status !== TaskStatus.PENDING) {
          // Cancelled yoki boshqa status bo'lsa, qayta ishlamaymiz
          this.logger.debug(`Task ${taskId} status=${task.status}, skipping`);
          return;
        }

        // Rate limiting (task turi bo'yicha)
        await this.ensureRateLimit(task.type);

        // Real qayta ishlash (MockService orqali)
        await this.tasksService.processTaskById(taskId);
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: +(process.env.REDIS_PORT ?? 6379),
        },
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Job ${job?.id} failed: ${err?.message}`);
    });
  }

  private async ensureRateLimit(type: string): Promise<void> {
    // Per-minute limitlar: requirements bo'yicha
    const windowMs = 60_000;
    let limit: number | null = null;

    switch (type) {
      case 'email':
        limit = 5; // 5 ta/minut (requirements bo'yicha)
        break;
      case 'report':
        limit = 2; // 2 ta/minut (requirements bo'yicha)
        break;
      default:
        // Boshqa turlar uchun limit qo'ymaymiz
        return;
    }

    const windowKey = Math.floor(Date.now() / windowMs);
    const key = `rate:${type}:${windowKey}`;

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.pexpire(key, windowMs);
    }

    if (current > limit) {
      // Limitdan oshsa, xato tashlaymiz -> BullMQ retry + exponential backoff ishga tushadi
      throw new Error(`Rate limit exceeded for task type ${type}`);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    await this.redis.quit();
  }
}

