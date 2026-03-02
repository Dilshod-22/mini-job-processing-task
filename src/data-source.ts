import { DataSource } from 'typeorm';
import { User } from './users/users.entity';
import { Task } from './tasks/task.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '0102',
  database: 'mini_job_db',
  entities: [User, Task],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
