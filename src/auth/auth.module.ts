import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

// Default JWT expiration in seconds: 60 minutes = 3600 seconds (within 15-60 min requirement)
const DEFAULT_JWT_EXPIRES_IN = 3600;

function getJwtExpiresIn(): number {
  const envValue = process.env.JWT_EXPIRES_IN;
  if (!envValue) return DEFAULT_JWT_EXPIRES_IN;

  // If it's a number string, parse it as seconds
  const parsed = parseInt(envValue, 10);
  if (!isNaN(parsed)) return parsed;

  // Otherwise, try to parse time strings like "60m", "1h"
  const match = envValue.match(/^(\d+)(m|h|s)?$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    switch (unit) {
      case 'h':
        return value * 3600;
      case 'm':
        return value * 60;
      default:
        return value;
    }
  }

  return DEFAULT_JWT_EXPIRES_IN;
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev_jwt_secret',
      signOptions: {
        expiresIn: getJwtExpiresIn(),
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}

