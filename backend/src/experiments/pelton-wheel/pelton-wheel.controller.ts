import { Body, Controller, Get, Post } from '@nestjs/common';
import { CalculateDto, SimulateDto, SweepDto } from './pelton-wheel.dto';
import { PELTON_WHEEL } from './pelton-wheel.content';
import { calculate, simulate, sweep } from './pelton-wheel.physics';

@Controller('experiments/pelton-wheel')
export class PeltonWheelController {
  @Get()
  getExperiment() {
    return PELTON_WHEEL;
  }

  @Post('simulate')
  simulateRig(@Body() dto: SimulateDto) {
    return simulate(dto);
  }

  @Post('calculate')
  calculateRow(@Body() dto: CalculateDto) {
    return calculate(dto);
  }

  @Post('sweep')
  sweepRuns(@Body() dto: SweepDto) {
    return sweep(dto.nozzleStep, dto.points);
  }
}
