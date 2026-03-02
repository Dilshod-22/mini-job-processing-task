import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: TokenResponseDto, description: 'Registers a new user and returns JWT token' })
  async register(@Body() body: RegisterDto): Promise<TokenResponseDto> {
    const { email, password } = body;
    return this.authService.register(email, password);
  }

  @Post('login')
  @ApiOkResponse({ type: TokenResponseDto, description: 'Logs in existing user and returns JWT token' })
  async login(@Body() body: LoginDto): Promise<TokenResponseDto> {
    const { email, password } = body;
    return this.authService.login(email, password);
  }
}

