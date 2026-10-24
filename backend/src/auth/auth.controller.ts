import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  activitiesSince,
  createGoogleUser,
  createSession,
  deleteSession,
  insertActivity,
  userByEmail,
} from '../db/repo';
import { AuthGuard, toPublicUser, type AuthedRequest } from './auth.guard';
import { verifyPassword } from './password';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class FirebaseLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

// Checks Firebase ID tokens for this project. Needs only the project id, not a service account key.
function firebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new ServiceUnavailableException('Google sign-in is not set up on this server yet');
  const app = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(app);
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

  // Google sign-in: the browser signs in with Firebase and sends the ID token here. Any Google account can sign up.
  @Post('firebase')
  @HttpCode(200)
  async firebase(@Body() dto: FirebaseLoginDto) {
    const decoded = await firebaseAuth()
      .verifyIdToken(dto.idToken)
      .catch(() => null);
    if (!decoded?.email || decoded.email_verified !== true || decoded.firebase?.sign_in_provider !== 'google.com') {
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
    const email = decoded.email.toLowerCase();
    const user =
      (await userByEmail(email)) ??
      (await createGoogleUser(email, decoded.name?.trim() || email.split('@')[0]));
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
