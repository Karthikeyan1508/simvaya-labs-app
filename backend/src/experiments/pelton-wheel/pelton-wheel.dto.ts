import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, Max, Min } from 'class-validator';

export class SimulateDto {
  @IsBoolean()
  pumpOn!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  nozzleStep!: number;

  @IsNumber()
  @Min(0)
  @Max(40)
  deadWeightKg!: number;

  @IsNumber()
  @Min(0)
  @Max(40)
  springKg!: number;
}

export class CalculateDto {
  @IsNumber()
  @Min(0)
  @Max(40)
  deadWeightKg!: number;

  @IsNumber()
  @Min(0)
  @Max(40)
  springKg!: number;

  @IsNumber()
  @Min(0)
  @Max(7)
  p1!: number;

  @IsNumber()
  @Min(0)
  @Max(7)
  p2!: number;

  @IsNumber()
  @Min(0)
  @Max(7)
  pp!: number;

  @IsNumber()
  @Min(0)
  @Max(5000)
  speedRpm!: number;
}

export class SweepDto {
  @IsInt()
  @Min(1)
  @Max(8)
  nozzleStep!: number;

  @IsInt()
  @Min(3)
  @Max(30)
  points!: number;
}
