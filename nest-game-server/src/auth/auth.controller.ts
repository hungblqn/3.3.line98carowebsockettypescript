import { Controller, Post, Body, Put } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return this.authService.register(username, password);
  }

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(username, password);
  }

  @Put('email')
  async updateEmail(@Body('token') token: string, @Body('email') email: string) {
    return this.authService.updateEmail(token, email);
  }

  @Put('username')
  async updateUsername(@Body('token') token: string, @Body('username') username: string) {
    return this.authService.updateUsername(token, username);
  }
}
