import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { insertActivity, insertRecording, listActivities, listRecordings } from '../db/repo';

const RECORDING_LIMIT_CHARS = 20_000;

class CreateRecordingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  experimentId!: string;

  @IsObject()
  data!: Record<string, unknown>;
}

class ActivityDto {
  @IsIn(['experiment_opened', 'attempt_started', 'sweep_run'])
  type!: 'experiment_opened' | 'attempt_started' | 'sweep_run';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  experimentId?: string;
}

@Controller('me')
@UseGuards(AuthGuard)
export class RecordsController {
  @Get('recordings')
  recordings(@Req() req: AuthedRequest, @Query('experimentId') experimentId?: string) {
    return listRecordings(req.user.id, experimentId).map((r) => ({
      id: r.id,
      experimentId: r.experiment_id,
      data: JSON.parse(r.data) as Record<string, unknown>,
      createdAt: r.created_at,
    }));
  }

  @Post('recordings')
  createRecording(@Req() req: AuthedRequest, @Body() dto: CreateRecordingDto) {
    if (JSON.stringify(dto.data).length > RECORDING_LIMIT_CHARS) {
      throw new BadRequestException('Recording is too large');
    }
    const saved = insertRecording(req.user.id, dto.experimentId, dto.data);
    insertActivity(req.user.id, 'row_recorded', dto.experimentId);
    return saved;
  }

  @Get('activities')
  activities(@Req() req: AuthedRequest, @Query('limit') limit?: string) {
    const n = Math.min(200, Math.max(1, Number(limit ?? 50) || 50));
    return listActivities(req.user.id, n).map((a) => ({
      id: a.id,
      type: a.type,
      experimentId: a.experiment_id,
      createdAt: a.created_at,
    }));
  }

  @Post('activities')
  logActivity(@Req() req: AuthedRequest, @Body() dto: ActivityDto) {
    insertActivity(req.user.id, dto.type, dto.experimentId ?? null);
    return { ok: true };
  }
}
