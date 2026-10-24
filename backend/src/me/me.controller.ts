import { BadRequestException, Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength, IsNotEmpty } from 'class-validator';
import { AuthGuard, toPublicUser, type AuthedRequest } from '../auth/auth.guard';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  activitiesSince,
  attemptsByExperiment,
  countRecordings,
  lastActivityAt,
  setPasswordHash,
  updateProfile,
  userById,
} from '../db/repo';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  rollNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  college?: string;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  current!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  next!: string;
}

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  profile(@Req() req: AuthedRequest) {
    return toPublicUser(req.user);
  }

  @Patch()
  async update(@Req() req: AuthedRequest, @Body() dto: UpdateProfileDto) {
    await updateProfile(req.user.id, dto);
    return toPublicUser((await userById(req.user.id))!);
  }

  @Post('password')
  async changePassword(@Req() req: AuthedRequest, @Body() dto: ChangePasswordDto) {
    const row = (await userById(req.user.id))!;
    if (!verifyPassword(dto.current, row.password_hash)) {
      throw new BadRequestException('Current password is incorrect');
    }
    await setPasswordHash(row.id, hashPassword(dto.next));
    return { ok: true };
  }

  // Numbers for the dashboard overview. Viva score stays null until the viva module exists.
  @Get('summary')
  async summary(@Req() req: AuthedRequest) {
    const id = req.user.id;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const attempts = (await attemptsByExperiment(id)).map((a) => ({ experimentId: a.experiment_id, count: a.n }));
    return {
      attempts: {
        total: attempts.reduce((s, a) => s + a.count, 0),
        byExperiment: attempts,
      },
      recordings: await countRecordings(id),
      activitiesThisWeek: await activitiesSince(id, weekAgo),
      lastActiveAt: await lastActivityAt(id),
      vivaScore: null,
    };
  }
}
