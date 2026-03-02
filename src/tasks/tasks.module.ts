import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { MockModule } from '../mock/mock.module';
import { AuthModule } from '../auth/auth.module';
import { Task } from './task.entity';
import { TasksWorker } from './tasks.worker';
import { AdminTasksController } from './admin-tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), MockModule, AuthModule],
  providers: [TasksService, TasksWorker],
  controllers: [TasksController, AdminTasksController],
  exports: [TasksService],
})
export class TasksModule {}

