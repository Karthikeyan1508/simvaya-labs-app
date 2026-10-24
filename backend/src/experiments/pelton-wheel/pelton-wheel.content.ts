export interface ComponentInfo {
  id: string;
  label: string;
  description: string;
  specs: string[];
}

export interface ProcedureStep {
  step: number;
  text: string;
  highlight: string[];
  setup?: { pumpOn?: boolean };
}

export const PELTON_WHEEL = {
  id: 'pelton-wheel',
  title: 'Performance characteristics of a Pelton turbine',
  aim: 'To study the performance characteristics of a Pelton turbine.',
  apparatus: [
    'Pelton wheel turbine',
    'Nozzle and spear arrangement',
    'Pressure gauges (3 nos., range 0 to 7 kg/cm2)',
  ],
  theory:
    'The Pelton wheel is an impulse turbine. A nozzle converts high head into a jet. The jet strikes the double-cup buckets on the runner and turns the shaft. The spear varies nozzle opening between 1/8 and 8/8.',
  constants: {
    hangerKg: 1,
    drumDiameterM: 0.4,
    ropeDiameterM: 0.015,
    effectiveDiameterM: 0.415,
  },
  components: [
    {
      id: 'base',
      label: 'Base frame and sump',
      description: 'Carries all units. Sump under the pump holds the water supply.',
      specs: ['Single rigid frame'],
    },
    {
      id: 'pump',
      label: 'Centrifugal pump',
      description: 'Pushes water into the penstock at high pressure.',
      specs: ['Started in step 2 (priming)'],
    },
    {
      id: 'penstock',
      label: 'Penstock pipe',
      description: 'Carries pressurised water from the pump to the nozzle inlet.',
      specs: ['Feeds venturimeter and nozzle'],
    },
    {
      id: 'venturi',
      label: 'Venturimeter with manometer',
      description: 'Throat restriction. Pressure difference P2 - P1 gives head H.',
      specs: ['P = P2 - P1 (kg/cm2)', 'H = P x 10 (m)', 'Qact = 0.0055 x sqrt(H) (m3/s)'],
    },
    {
      id: 'gauge_p1',
      label: 'Pressure gauge P1 (venturi throat)',
      description: 'Reads pressure at the venturi throat.',
      specs: ['Range 0 to 7 kg/cm2'],
    },
    {
      id: 'gauge_p2',
      label: 'Pressure gauge P2 (venturi inlet)',
      description: 'Reads upstream pressure at the venturi.',
      specs: ['Range 0 to 7 kg/cm2'],
    },
    {
      id: 'gauge_p3',
      label: 'Pressure gauge Pp (penstock)',
      description: 'Reads penstock pressure. Gives penstock head Hp and turbine inlet head Hi.',
      specs: ['Hp = Pp x 10 (m)', 'Range 0 to 7 kg/cm2'],
    },
    {
      id: 'frame',
      label: 'Support frame and gauge board',
      description: 'Chrome rods carry the spring balance and the brake rope. Board holds the gauges.',
      specs: ['Two chrome rods', 'Top and mid bars'],
    },
    {
      id: 'nozzle',
      label: 'Nozzle',
      description: 'Turns pressure head into a high velocity jet.',
      specs: ['Velocity coefficient Cv = 0.97'],
    },
    {
      id: 'spear',
      label: 'Spear (needle valve)',
      description: 'Slides in and out of the nozzle orifice to set opening.',
      specs: ['Opening 1/8 to 8/8 in 8 positions'],
    },
    {
      id: 'runner',
      label: 'Pelton runner',
      description: 'Double-cup buckets on the rim. The jet impulse turns the runner.',
      specs: ['Pitch diameter 420 mm'],
    },
    {
      id: 'casing',
      label: 'Turbine casing',
      description: 'Encloses the runner and collects spent water. Shown transparent.',
      specs: [],
    },
    {
      id: 'shaft',
      label: 'Shaft',
      description: 'Carries torque from the runner to the brake drum.',
      specs: [],
    },
    {
      id: 'brake_drum',
      label: 'Brake drum (400 mm)',
      description: 'Rope wraps the drum. Effective diameter with rope is 415 mm.',
      specs: ['Drum 400 mm', 'Effective D = 415 mm'],
    },
    {
      id: 'rope',
      label: 'Brake rope (15 mm)',
      description: 'Connects drum to the hanger (dead weights) and the spring balance.',
      specs: ['Rope diameter 15 mm'],
    },
    {
      id: 'deadweights',
      label: 'Dead weights and hanger',
      description: 'Dead weights T1 hang on the hanger. Hanger T0 = 1 kg is fixed.',
      specs: ['T1 = dead weights (kg)', 'T0 = 1 kg hanger'],
    },
    {
      id: 'spring',
      label: 'Spring balance (T2)',
      description: 'Reads the opposing tension T2. Net load T = T1 + T0 - T2.',
      specs: ['Net load T = T1 + T0 - T2 (kg)'],
    },
    {
      id: 'tacho',
      label: 'Tachometer (N, r.p.m.)',
      description: 'Reads runner speed at the shaft end.',
      specs: ['Speed N in r.p.m.'],
    },
  ] as ComponentInfo[],
  procedure: [
    {
      step: 1,
      text: 'Keep nozzle opening at the required position (1/8 to 8/8).',
      highlight: ['nozzle', 'spear'],
    },
    {
      step: 2,
      text: 'Prime and start the pump.',
      highlight: ['pump', 'penstock'],
      setup: { pumpOn: true },
    },
    {
      step: 3,
      text: 'Allow water to rotate the turbine.',
      highlight: ['runner', 'casing'],
    },
    {
      step: 4,
      text: 'Note the speed of the turbine on the tachometer.',
      highlight: ['tacho'],
    },
    {
      step: 5,
      text: 'Take readings from pressure gauges P1, P2 and Pp.',
      highlight: ['gauge_p1', 'gauge_p2', 'gauge_p3'],
    },
    {
      step: 6,
      text: 'Load the turbine by placing dead weights on the hanger.',
      highlight: ['deadweights', 'rope', 'brake_drum'],
    },
    {
      step: 7,
      text: 'Note the dead weights (T1) and spring balance reading (T2).',
      highlight: ['spring', 'deadweights'],
    },
    {
      step: 8,
      text: 'Note the head level on the venturi manometer.',
      highlight: ['venturi'],
    },
    {
      step: 9,
      text: 'Repeat steps 6 to 8 for different loading conditions and record each row.',
      highlight: ['brake_drum'],
    },
  ] as ProcedureStep[],
};
