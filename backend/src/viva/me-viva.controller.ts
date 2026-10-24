import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { listOpenVivas, saveAnswer, startAttempt, studentViva, submitAttempt } from './viva.service';
import { AnswerDto } from './viva.dto';

// Student routes. Any signed-in user. Answer keys only appear after submit.
@Controller('me/vivas')
@UseGuards(AuthGuard)
export class MeVivaController {
  @Get()
  list(@Req() req: AuthedRequest) {
    return listOpenVivas(req.user.id);
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

  @Post(':id/submit')
  @HttpCode(200)
  submit(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return submitAttempt(id, req.user.id);
  }
}
