import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import {
  createSelfAssessment,
  listMyVivas,
  saveAnswer,
  saveSpokenAnswer,
  saveTranscript,
  startAttempt,
  studentViva,
  submitAttempt,
} from './viva.service';
import { AnswerDto, SelfAssessmentDto, SpokenAnswerDto, TranscriptDto } from './viva.dto';

// Student routes. Each student sees only the self-assessments they made. Answer keys only appear after submit.
@Controller('me/vivas')
@UseGuards(AuthGuard)
export class MeVivaController {
  @Get()
  list(@Req() req: AuthedRequest) {
    return listMyVivas(req.user.id);
  }

  // Generates the questions (AgenticOrg, then Groq, then templates) and saves them as a published viva the student owns.
  @Post('self-assessments')
  create(@Req() req: AuthedRequest, @Body() dto: SelfAssessmentDto) {
    return createSelfAssessment(dto.experimentId, req.user.id);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return startAttempt(id, req.user.id);
  }

  @Get(':id')
  detail(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return studentViva(id, req.user.id);
  }

  @Put(':id/answers')
  answer(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: AnswerDto) {
    return saveAnswer(id, dto, req.user.id);
  }

  // Oral interview: one spoken answer, sent by the examiner agent's tool.
  @Post(':id/spoken-answer')
  @HttpCode(200)
  spokenAnswer(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: SpokenAnswerDto) {
    return saveSpokenAnswer(id, dto, req.user.id);
  }

  @Put(':id/transcript')
  transcript(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: TranscriptDto) {
    return saveTranscript(id, dto.transcript, req.user.id);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return submitAttempt(id, req.user.id);
  }
}
