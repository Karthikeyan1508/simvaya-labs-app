import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { attemptsByExperiment } from '../db/repo';
import { SEMESTERS } from './catalog';

// Semesters and subjects for the signed-in student, with how many of each lab's experiments they performed.
@Controller('academics')
@UseGuards(AuthGuard)
export class AcademicsController {
  @Get()
  async overview(@Req() req: AuthedRequest) {
    const performed = new Set((await attemptsByExperiment(req.user.id)).map((a) => a.experiment_id));
    const active = req.user.semester;

    return {
      branch: req.user.branch,
      activeSemester: active,
      semesters: SEMESTERS.map((s) => ({
        number: s.number,
        status: s.number < active ? 'completed' : s.number === active ? 'active' : 'upcoming',
        subjects: s.subjects.map((sub) => {
          const done = sub.experiments.filter((e) => e.available && performed.has(e.id)).length;
          const available = sub.experiments.filter((e) => e.available).length;
          return {
            id: sub.id,
            name: sub.name,
            lab: sub.lab,
            experiments: sub.experiments.map((e) => ({
              ...e,
              performed: performed.has(e.id),
            })),
            performed: done,
            availableExperiments: available,
          };
        }),
      })),
    };
  }
}
