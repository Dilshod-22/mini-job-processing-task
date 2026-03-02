import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { TasksModule } from '../tasks/tasks.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TasksModule, AuthModule],
  controllers: [MetricsController],
})
export class MetricsModule {}

