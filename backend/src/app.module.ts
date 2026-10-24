import { Module } from '@nestjs/common';
import { AcademicsController } from './academics/academics.controller';
import { AuthController } from './auth/auth.controller';
import { MeController } from './me/me.controller';
import { RecordsController } from './me/records.controller';
import { PeltonWheelController } from './experiments/pelton-wheel/pelton-wheel.controller';
import { InductionMotorController } from './experiments/induction-motor/induction-motor.controller';
import { VivaController } from './viva/viva.controller';
import { MeVivaController } from './viva/me-viva.controller';
import { VoiceController } from './voice/voice.controller';

@Module({
  controllers: [
    AuthController,
    MeController,
    RecordsController,
    AcademicsController,
    PeltonWheelController,
    InductionMotorController,
    VivaController,
    MeVivaController,
    VoiceController,
  ],
})
export class AppModule {}
