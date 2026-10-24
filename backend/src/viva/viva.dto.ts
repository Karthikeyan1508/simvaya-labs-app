import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { EXPERIMENT_IDS } from './types';

// Starts a self-assessment for an experiment. The questions are generated in the service.
export class SelfAssessmentDto {
  @IsIn(EXPERIMENT_IDS)
  experimentId!: string;
}

// One spoken answer from the oral interview. questionNumber counts from 1 in the order the student hears them.
export class SpokenAnswerDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsInt()
  option?: number;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsInt()
  step?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partId?: string;
}

// The interview transcript, kept with the attempt. Checked again in the service.
export class TranscriptDto {
  @IsArray()
  @ArrayMaxSize(500)
  transcript!: unknown[];
}

export class AnswerDto {
  @IsInt()
  questionId!: number;

  @IsObject()
  answer!: Record<string, unknown>;
}
