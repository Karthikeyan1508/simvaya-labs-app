import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  changeStatus,
  createViva,
  gradeAttempt,
  listTeacherVivas,
  proposeQuestions,
  removeViva,
  teacherViva,
  updateViva,
} from './viva.service';
import { CreateVivaDto, GradeDto, ProposalDto, StatusDto, UpdateVivaDto } from './viva.dto';

// Teacher routes. Only users with role teacher get through.
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('teacher')
export class VivaController {
  @Post('viva/proposals')
  @HttpCode(200)
  proposals(@Body() dto: ProposalDto) {
    return proposeQuestions(dto);
  }

  @Post('vivas')
  create(@Req() req: AuthedRequest, @Body() dto: CreateVivaDto) {
    return createViva(dto, req.user.id);
  }

  @Get('vivas')
  list(@Req() req: AuthedRequest) {
    return listTeacherVivas(req.user.id);
  }

  @Get('vivas/:id')
  detail(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return teacherViva(id, req.user.id);
  }

  @Put('vivas/:id')
  update(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVivaDto) {
    return updateViva(id, dto, req.user.id);
  }

  @Patch('vivas/:id/status')
  status(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    return changeStatus(id, dto.status, req.user.id);
  }

  @Delete('vivas/:id')
  remove(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return removeViva(id, req.user.id);
  }

  @Post('vivas/:id/attempts/:attemptId/grade')
  @HttpCode(200)
  grade(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: GradeDto,
  ) {
    return gradeAttempt(id, attemptId, dto, req.user.id);
  }
}
