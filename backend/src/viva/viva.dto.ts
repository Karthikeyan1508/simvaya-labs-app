import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { EXPERIMENT_IDS } from './types';

// Each question is checked by parseDraft in the service, so the array items are not decorated here.

export class ProposalDto {
  @IsIn(EXPERIMENT_IDS)
  experimentId!: string;

  @IsIn(['template', 'ai'])
  mode!: 'template' | 'ai';

  @IsObject()
  counts!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class CreateVivaDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsIn(EXPERIMENT_IDS)
  experimentId!: string;

  @IsArray()
  @ArrayMaxSize(200)
  questions!: unknown[];

  @IsBoolean()
  publish!: boolean;
}

export class UpdateVivaDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  questions?: unknown[];
}

export class StatusDto {
  @IsIn(['draft', 'published', 'closed'])
  status!: 'draft' | 'published' | 'closed';
}

export class GradeDto {
  @IsInt()
  questionId!: number;

  @IsNumber()
  score!: number;
}

export class AnswerDto {
  @IsInt()
  questionId!: number;

  @IsObject()
  answer!: Record<string, unknown>;
}
