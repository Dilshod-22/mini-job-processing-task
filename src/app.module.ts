import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/users.entity';
import { Task } from './tasks/task.entity';
import { MockModule } from './mock/mock.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgress',
      password: 'yourpassword',
      database: 'mini_job_db',
      entities: [User, Task],
      synchronize: false,
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
    }),
    MockModule,
    UsersModule,
    AuthModule,
    TasksModule,
    MetricsModule,
  ],
})
export class AppModule {}
