import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExperimentInfo, SimReadings } from './induction.ts';
import {
  buildInductionPrompt,
  buildInductionVoiceTools,
  inductionReadingsText,
  inductionTopicText,
  type InductionRigState,
  type InductionVoiceBridge,
} from './voice-induction.ts';

const exp = {
  title: 'Load test on a three-phase induction motor',
  aim: 'Aim text.',
  apparatus: ['Motor'],
  theory: ['Principle one.', 'Principle two.', 'Torque text.', 'Input power text.', 'Efficiency text.'],
  nameplate: {
    ratedPowerKw: 2.2,
    lineVoltageV: 415,
    ratedCurrentA: 4.5,
    frequencyHz: 50,
    poles: 4,
    ratedSpeedRpm: 1440,
    ratedPowerFactor: 0.8,
    ratedEfficiencyPct: 85,
    connection: 'delta',
    illustrative: true,
  },
  components: [
    { id: 'stator', label: 'Stator', description: 'Winding.', specs: [] },
    { id: 'voltmeter', label: 'Voltmeter (VL)', description: 'Reads VL.', specs: ['Reads VL in volts'] },
  ],
  stages: [
    { id: 'intro', title: 'Introduction', text: 'Read the aim.' },
    { id: 'apparatus', title: 'Apparatus', text: 'Check the list.' },
  ],
} as unknown as ExperimentInfo;

const sim = (over: Partial<SimReadings> = {}): SimReadings => ({
  running: false,
  VL: 0,
  IL: 0,
  W1: 0,
  W2: 0,
  pinW: 0,
  pf: 0,
  speedRpm: 0,
  syncRpm: 1500,
  slipPct: 0,
  torqueNm: 0,
  poutW: 0,
  etaPct: 0,
  s1Kg: 0,
  s2Kg: 0,
  warnings: [],
  ...over,
});

// A bridge with a rig that is ready to start: supply on, safety checks acknowledged, motor stopped.
function fake(over: Partial<InductionVoiceBridge> = {}, rigOver: Partial<InductionRigState> = {}) {
  const calls: string[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(args.length ? `${name}:${JSON.stringify(args)}` : name);
    };
  const rig: InductionRigState = {
    sim: sim(),
    supplyOn: true,
    running: false,
    emergency: false,
    paused: false,
    loadKg: 0,
    canStart: true,
    start: rec('start'),
    stop: rec('stop'),
    ...rigOver,
  };
  const b: InductionVoiceBridge = {
    exp,
    parts: exp.components,
    prompt: 'prompt',
    firstMessage: 'hi',
    setVoiceHighlight: rec('setVoiceHighlight'),
    armed: true,
    rig,
    view: 'scene',
    setView: rec('setView'),
    setCutaway: rec('setCutaway'),
    setPart: rec('setPart'),
    showSimulation: rec('showSimulation'),
    goToStage: rec('goToStage'),
    ...over,
  };
  return { b, calls, tools: buildInductionVoiceTools(() => b) };
}

test('topics come from the backend theory paragraphs, by position', () => {
  assert.equal(inductionTopicText(exp, 'principle'), 'Principle one. Principle two.');
  assert.equal(inductionTopicText(exp, 'torque'), 'Torque text.');
  assert.equal(inductionTopicText(exp, 'efficiency'), 'Efficiency text.');
  assert.match(inductionTopicText(exp, 'procedure'), /Introduction: Read the aim\./);
});

test('readings are labelled simulated and list any warning', () => {
  const text = inductionReadingsText(
    { ...fake().b.rig, running: true, loadKg: 4, sim: sim({ running: true, IL: 5, speedRpm: 1450, warnings: ['over_rated_current'] }) },
    exp,
  );
  assert.match(text, /The motor is running\. Load 4 kg/);
  assert.match(text, /line current 5\.00 A/);
  assert.match(text, /Current is above the rated 4\.5 A\./);
  assert.match(text, /These readings are simulated, not measured\./);
});

test('prompt lists the parts with their ids and the stages, and says what set_nozzle does', () => {
  const prompt = buildInductionPrompt(exp);
  assert.match(prompt, /\[voltmeter\] Voltmeter \(VL\)/);
  assert.match(prompt, /1\. Introduction: Read the aim\./);
  assert.match(prompt, /set_nozzle does not apply to this rig/);
});

test('set_pump starts the motor only when the supply is on and the checks are acknowledged', () => {
  const ready = fake();
  assert.equal(ready.tools.set_pump({ on: true }), 'Motor started.');
  assert.deepEqual(ready.calls.filter((c) => c === 'start'), ['start']);

  const noSupply = fake({}, { supplyOn: false, canStart: false });
  assert.equal(noSupply.tools.set_pump({ on: true }), 'Switch the supply on first.');
  assert.ok(!noSupply.calls.includes('start'));

  const unarmed = fake({ armed: false }, { canStart: false });
  assert.match(unarmed.tools.set_pump({ on: true }) as string, /Acknowledge the safety checks/);
  assert.ok(!unarmed.calls.includes('start'));

  const stopped = fake({}, { emergency: true, canStart: false });
  assert.match(stopped.tools.set_pump({ on: true }) as string, /emergency stop is active/);
  assert.ok(!stopped.calls.includes('start'));
});

test('set_pump off stops the motor and needs a yes or no', () => {
  const { tools, calls } = fake({}, { running: true, canStart: false });
  assert.equal(tools.set_pump({ on: false }), 'Motor stopped.');
  assert.ok(calls.includes('stop'));
  assert.equal(tools.set_pump({}), 'Say whether the motor is to run or stop.');
});

test('explode_model makes the frame see-through on the 3D bench, and reassemble closes it', () => {
  const { tools, calls } = fake();
  tools.explode_model({});
  tools.reassemble_model({});
  assert.deepEqual(calls, ['showSimulation', 'setView:["scene"]', 'setCutaway:[true]', 'setCutaway:[false]']);
});

test('focus_part shows electrical instruments on the circuit and the machine on the 3D bench', () => {
  const { tools, calls } = fake();
  assert.equal(tools.focus_part({ partId: 'voltmeter' }), 'Voltmeter (VL) is selected.');
  assert.ok(calls.includes('setView:["circuit"]'));
  tools.focus_part({ partId: 'stator' });
  assert.ok(calls.includes('setView:["scene"]'));
  assert.match(tools.focus_part({ partId: 'speed_sensor' }) as string, /^Unknown part/);
});

test('set_view takes scene or circuit only', () => {
  const { tools } = fake();
  assert.equal(tools.set_view({ view: 'iso' }), 'View must be one of: scene, circuit.');
  assert.equal(tools.set_view({ view: 'circuit' }), 'Showing the circuit diagram.');
});

test('go_to_step opens a procedure stage and reads it back', () => {
  const { tools, calls } = fake();
  assert.equal(tools.go_to_step({ step: 2 }), 'Step 2: Apparatus. Check the list.');
  assert.match(tools.go_to_step({ step: 3 }) as string, /from 1 to 2/);
  assert.ok(calls.includes('goToStage:[1]'));
});

test('set_nozzle answers in one line and changes nothing', () => {
  const { tools, calls } = fake();
  assert.match(tools.set_nozzle({ step: 1 }), /no nozzle/);
  assert.deepEqual(calls, []);
});
