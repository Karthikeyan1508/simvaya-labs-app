import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class SimulateDto {
  @IsNumber()
  @Min(0)
  @Max(40)
  loadKg!: number;

  @IsBoolean()
  running!: boolean;

  @IsBoolean()
  supplyOn!: boolean;
}

export class RawReadingsDto {
  @IsNumber()
  @Min(0)
  @Max(1000)
  VL!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  IL!: number;

  // Wattmeter readings may be negative.
  @IsNumber()
  W1!: number;

  @IsNumber()
  W2!: number;

  @IsNumber()
  @Min(0)
  @Max(200)
  s1Kg!: number;

  @IsNumber()
  @Min(0)
  @Max(200)
  s2Kg!: number;

  @IsNumber()
  @Min(0)
  @Max(3000)
  speedRpm!: number;
}
