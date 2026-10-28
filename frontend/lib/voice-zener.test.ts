import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MANUAL_NOTE, ZENER_PARTS, ZENER_STEPS } from './zener/content.ts';
import type { OperatingPoint } from './zener/solver.ts';
import { buildZenerVoiceTools, buildZenerPrompt, zenerFocusView, zenerReadingsText, zenerTopicText, type ZenerVoiceBridge } from './voice-zener.ts';

// A bridge that records every call the tools make, in order.
function fake(over: Partial<ZenerVoiceBridge> = {}) {
  const calls: string[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(args.length ? `${name}:${JSON.stringify(args)}` : name);
    };
  const b: ZenerVoiceBridge = {
    parts: ZENER_PARTS,
    prompt: 'prompt',
    firstMessage: 'hi',
    vs: 8,
    rl: 1000,
    switchOn: true,
    op: null,
    setVoiceHighlight: rec('setVoiceHighlight'),
    setSwitch: rec('setSwitch'),
    setVs: rec('setVs'),
    setRl: rec('setRl'),
    setView: rec('setView'),
    setSelected: rec('setSelected'),
    goToStep: rec('goToStep'),
    showSimulation: rec('showSimulation'),
    ...over,
  };
  return { b, calls, tools: buildZenerVoiceTools(() => b) };
}

const regulating: OperatingPoint = {
  ok: true,
  vOut: 5.1,
  iZ: 0.0123,
  iL: 0.0051,
  iS: 0.0174,
  pZ: 0.0627,
  pRs: 0.0,
  regulating: true,
  warnings: [],
};

test('focus view frames the meters, the Zener and the supply, and keeps the view for other parts', () => {
  assert.equal(zenerFocusView('vout_meter'), 'meters');
  assert.equal(zenerFocusView('zener'), 'regulator');
  assert.equal(zenerFocusView('supply'), 'supply');
  assert.equal(zenerFocusView('switch'), undefined);
});

test('readings say so when the switch is open or the setting is not valid', () => {
  const open = zenerReadingsText({ vs: 8, rl: 1000, switchOn: false, op: regulating });
  assert.match(open, /Every meter reads zero/);
  assert.match(zenerReadingsText({ vs: 8, rl: null, switchOn: true, op: null }), /not valid/);
});

test('readings give the output, the Zener current and the regulating state', () => {
  const text = zenerReadingsText({ vs: 8, rl: null, switchOn: true, op: regulating });
  assert.match(text, /no load/);
  assert.match(text, /Vout 5\.10 V/);
  assert.match(text, /Zener current 12\.3 mA/);
  assert.match(text, /The Zener is regulating/);
});

test('topics come from the lab content, and the sample table note is the manual note', () => {
  assert.equal(zenerTopicText('sample_table'), MANUAL_NOTE);
  assert.match(zenerTopicText('formulas'), /Iz = \(Vs - Vz\) \/ Rs - IL/);
  assert.match(zenerTopicText('procedure'), new RegExp(`8\\. ${ZENER_STEPS[7].text.slice(0, 20)}`));
});

test('prompt names the parts, the steps and the tools that do not apply on this bench', () => {
  const prompt = buildZenerPrompt();
  assert.match(prompt, /\[zener\] Zener diode/);
  assert.match(prompt, /explode_model, reassemble_model and set_nozzle do not apply/);
});

test('set_pump drives the supply switch and asks again when the value is missing', () => {
  const { calls, tools } = fake();
  assert.equal(tools.set_pump({ on: 'off' }), 'Supply switch is off.');
  assert.deepEqual(calls, ['showSimulation', 'setSwitch:[false]']);
  assert.equal(tools.set_pump({}), 'Say whether the supply switch is on or off.');
});

test('a part that is not on the bench is reported with the valid ids', () => {
  const { tools, calls } = fake();
  assert.match(tools.focus_part({ partId: 'nope' }) as string, /^Unknown part\. Use one of: supply,/);
  assert.deepEqual(calls, []);
});

test('focus_part selects the part and frames it', () => {
  const { calls, tools } = fake();
  assert.equal(tools.focus_part({ partId: 'zener' }), 'Zener diode is selected.');
  assert.deepEqual(calls, ['showSimulation', 'setSelected:["zener"]', 'setView:["regulator"]']);
});

test('highlight_parts keeps the known ids once, in order', () => {
  const { calls, tools } = fake();
  assert.equal(tools.highlight_parts({ partIds: ['supply', 'supply', 'bogus'] }), 'Highlighted DC supply.');
  assert.deepEqual(calls, ['showSimulation', 'setVoiceHighlight:[["supply"]]']);
});

test('set_view accepts only the bench views', () => {
  const { tools, calls } = fake();
  assert.equal(tools.set_view({ view: 'nozzle' }), 'View must be one of: iso, front, top, side, meters, regulator, supply, rheostat.');
  assert.deepEqual(calls, []);
  assert.equal(tools.set_view({ view: 'meters' }), 'Camera set to Meters.');
});

test('go_to_step checks the range and reads the step back', () => {
  const { calls, tools } = fake();
  assert.equal(tools.go_to_step({ step: 9 }), 'Step must be a whole number from 1 to 8.');
  assert.equal(tools.go_to_step({ step: '2' }), `Step 2: ${ZENER_STEPS[1].text}`);
  assert.deepEqual(calls, ['showSimulation', 'goToStep:[1]']);
});

test('tools with no control on this bench answer in one line and change nothing', () => {
  const { calls, tools } = fake();
  assert.match(tools.explode_model({}), /no model to pull apart/);
  assert.match(tools.set_nozzle({ step: 3 }), /no nozzle/);
  assert.deepEqual(calls, []);
});

test('read_readings reports the switch state when the switch is open', () => {
  const { tools } = fake({ switchOn: false });
  assert.match(tools.read_readings({}), /Every meter reads zero/);
});

test('set_control sets the supply voltage and the load, and validates', () => {
  const { tools, calls } = fake();
  assert.match(tools.set_control({ control: 'supply_voltage', value: '9.04' }), /9 volts/);
  assert.match(tools.set_control({ control: 'Load', value: 470 }), /470 ohms/);
  assert.match(tools.set_control({ control: 'load', value: 'none' }), /no load/);
  assert.deepEqual(calls.filter((c) => c.startsWith('set')), ['setVs:[9]', 'setRl:[470]', 'setRl:[null]']);
  calls.length = 0;
  for (const bad of [
    { control: 'supply_voltage', value: 16 },
    { control: 'supply_voltage', value: 'high' },
    { control: 'load', value: 50 },
    { control: 'load', value: 5000 },
    { control: 'load' },
    { control: 'gain', value: 1 },
    {},
  ]) assert.match(tools.set_control(bad), /must be|Unknown control/);
  assert.deepEqual(calls, []);
});
