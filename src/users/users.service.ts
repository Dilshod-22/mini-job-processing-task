import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createUser(
    email: string,
    passwordHash: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password_hash: passwordHash,
      role,
    });
    return this.usersRepository.save(user);
  }
}

