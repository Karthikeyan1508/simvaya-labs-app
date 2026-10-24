import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { INDUCTION_MOTOR } from './induction-motor.content';
import { InductionMotorController } from './induction-motor.controller';
import { RawReadingsDto, SimulateDto } from './induction-motor.dto';
import { derive, simulate } from './induction-motor.physics';
import { COMPONENT_IDS } from './induction-motor.types';

// @nestjs/common 12 is ESM only and this Jest setup runs CommonJS, so the decorators are stubbed here.
// The controller methods and the DTO rules are real.
jest.mock('@nestjs/common', () => ({
  Controller: () => () => undefined,
  Get: () => () => undefined,
  Post: () => () => undefined,
  Body: () => () => undefined,
}));

const STAGE_IDS = ['intro', 'apparatus', 'circuit', 'safety', 'no_load', 'loading', 'unload', 'analyse', 'viva', 'report'];

const validRaw = { VL: 415, IL: 4, W1: 1000, W2: 500, s1Kg: 11, s2Kg: 1, speedRpm: 1440 };

describe('induction motor controller', () => {
  const controller = new InductionMotorController();

  it('GET returns the experiment with every component and the ten stages', () => {
    const info = controller.getExperiment();
    expect(info).toBe(INDUCTION_MOTOR);
    expect(info.id).toBe('induction-motor');
    expect(info.components.map((c) => c.id).sort()).toEqual([...COMPONENT_IDS].sort());
    expect(info.stages.map((s) => s.id)).toEqual(STAGE_IDS);
    expect(info.nameplate.poles).toBe(4);
    expect(info.nameplate.illustrative).toBe(true);
  });

  it('simulate endpoint returns the physics result for the body', () => {
    expect(controller.simulateRig({ loadKg: 4, running: true, supplyOn: true })).toEqual(simulate(4, true, true));
  });

  it('calculate endpoint returns the derived readings for the row', () => {
    expect(controller.calculateRow(validRaw)).toEqual(derive(validRaw));
  });

  it('SimulateDto accepts a load from 0 to 40 and rejects anything else', () => {
    const check = (body: object) => validateSync(plainToInstance(SimulateDto, body)).length;
    expect(check({ loadKg: 0, running: true, supplyOn: true })).toBe(0);
    expect(check({ loadKg: 40, running: false, supplyOn: false })).toBe(0);
    expect(check({ loadKg: 41, running: true, supplyOn: true })).toBeGreaterThan(0);
    expect(check({ loadKg: -1, running: true, supplyOn: true })).toBeGreaterThan(0);
    expect(check({ loadKg: 4, running: 'yes', supplyOn: true })).toBeGreaterThan(0);
  });

  it('RawReadingsDto accepts negative wattmeters and rejects out-of-range readings', () => {
    const check = (body: object) => validateSync(plainToInstance(RawReadingsDto, body)).length;
    expect(check(validRaw)).toBe(0);
    expect(check({ ...validRaw, W1: -200, W2: -300 })).toBe(0);
    expect(check({ ...validRaw, VL: 1001 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, IL: -1 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, IL: 101 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, speedRpm: 3001 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, s1Kg: 201 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, s2Kg: -1 })).toBeGreaterThan(0);
    expect(check({ ...validRaw, W1: Infinity })).toBeGreaterThan(0);
    expect(check({ ...validRaw, speedRpm: undefined })).toBeGreaterThan(0);
  });
});
