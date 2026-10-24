import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { activitiesSince, createSession, deleteSession, insertActivity, userByEmail } from '../db/repo';
import { AuthGuard, toPublicUser, type AuthedRequest } from './auth.guard';
import { verifyPassword } from './password';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await userByEmail(dto.email.toLowerCase());
    if (!user || !verifyPassword(dto.password, user.password_hash)) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const token = await createSession(user.id);
    await insertActivity(user.id, 'signed_in', null);
    return { token, user: toPublicUser(user) };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthedRequest) {
    await deleteSession(req.token);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return toPublicUser(req.user);
  }

  // Used by the dashboard to show how many sign-ins happened this week.
  @Get('activity-since-week')
  @UseGuards(AuthGuard)
  async weekCount(@Req() req: AuthedRequest) {
    return { count: await activitiesSince(req.user.id, new Date(Date.now() - 7 * 86_400_000).toISOString()) };
  }
}
