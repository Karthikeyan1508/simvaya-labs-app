import { Body, Controller, Get, Post } from '@nestjs/common';
import { INDUCTION_MOTOR } from './induction-motor.content';
import { RawReadingsDto, SimulateDto } from './induction-motor.dto';
import { derive, simulate } from './induction-motor.physics';

@Controller('experiments/induction-motor')
export class InductionMotorController {
  @Get()
  getExperiment() {
    return INDUCTION_MOTOR;
  }

  @Post('simulate')
  simulateRig(@Body() dto: SimulateDto) {
    return simulate(dto.loadKg, dto.running, dto.supplyOn);
  }

  @Post('calculate')
  calculateRow(@Body() dto: RawReadingsDto) {
    return derive(dto);
  }
}
