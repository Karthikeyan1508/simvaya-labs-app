import type { ComponentInfo, ExperimentInfo, Nameplate, ProcedureStage } from './induction-motor.types';

// Illustrative nameplate. Replace with the rating plate values once faculty supply them.
export const NAMEPLATE: Nameplate = {
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
};

// Rope brake: drum radius R and belt thickness t in metres; S2 is the slack-side tare in kg.
export const BRAKE = { radiusM: 0.12, beltThicknessM: 0.012, tareKg: 1 };

const COMPONENTS: ComponentInfo[] = [
  {
    id: 'housing',
    label: 'Frame and ribbed housing',
    description: 'Outer frame that holds the stator core and protects the winding. The ribs carry heat from the stator to the air.',
    specs: ['Holds the stator core', 'Ribs give extra cooling surface'],
  },
  {
    id: 'stator',
    label: 'Stator (laminated core and winding)',
    description:
      'A laminated iron core carries the three-phase winding. The three phase currents, 120 degrees apart, produce a magnetic field that turns at synchronous speed.',
    specs: ['Three-phase winding, delta connected (nameplate)', 'Rotating field at 1500 rpm (50 Hz, 4 poles)'],
  },
  {
    id: 'rotor',
    label: 'Squirrel-cage rotor',
    description:
      'Laminated core with bars shorted at both ends by end rings. The rotating field induces current in the bars, and that current makes the torque. The rotor runs slightly slower than the field.',
    specs: ['Bars and end rings, no external connection', 'Rated speed 1440 rpm (slip 4 %)'],
  },
  {
    id: 'shaft',
    label: 'Shaft',
    description: 'Carries the torque from the rotor to the brake drum.',
    specs: ['Drives the brake drum and the fan'],
  },
  {
    id: 'bearing_de',
    label: 'Drive-end bearing',
    description: 'Supports the shaft on the drive side, where the brake drum is mounted.',
    specs: ['Ball bearing'],
  },
  {
    id: 'bearing_nde',
    label: 'Non-drive-end bearing',
    description: 'Supports the shaft on the fan side, at the back of the motor.',
    specs: ['Ball bearing'],
  },
  {
    id: 'fan',
    label: 'Cooling fan',
    description: 'Fixed on the rear of the shaft. It turns with the rotor and blows air over the frame. Keep the fan cover in place.',
    specs: ['Turns only when the motor runs', 'Covered by the fan cover'],
  },
  {
    id: 'terminal_box',
    label: 'Terminal box',
    description: 'Holds the stator terminals. The supply goes to U, V and W, and the earth terminal is inside the box.',
    specs: ['Terminals U, V, W', 'Protective earth terminal'],
  },
  {
    id: 'feet',
    label: 'Mounting feet',
    description: 'Bolt the motor to the base frame. Good mounting keeps the shaft in line with the brake drum.',
    specs: ['Bolted to the base frame'],
  },
  {
    id: 'brake_drum',
    label: 'Brake drum (rope brake)',
    description:
      'The belt wraps the drum. The difference in tension between the tight side (S1) and the slack side (S2) is the friction force that loads the motor.',
    specs: ['Drum radius R = 120 mm', 'Belt thickness t = 12 mm', 'Torque = (S1 - S2) x g x (R + t/2)'],
  },
  {
    id: 'spring_balances',
    label: 'Spring balances S1 and S2',
    description:
      'S1 reads the tight side of the belt and S2 the slack side. S2 has a 1 kg tare. Their difference is the net brake force.',
    specs: ['S1 = tare + load (kg)', 'S2 = 1 kg tare', 'Net force = S1 - S2 (kg)'],
  },
  {
    id: 'supply_panel',
    label: 'Supply panel',
    description: 'Carries the instruments, the starter and the emergency stop. The three-phase supply is switched on from here.',
    specs: ['Three-phase supply through the isolator', 'Holds the instruments'],
  },
  {
    id: 'starter',
    label: 'Starter',
    description: 'Connects the motor to the supply. Use it to start and stop the motor. It gives overload protection.',
    specs: ['Start and stop', 'Overload protection'],
  },
  {
    id: 'estop',
    label: 'Emergency stop',
    description: 'Red push button that cuts the supply to the motor at once. Press it if the motor or the load behaves abnormally.',
    specs: ['Red push button', 'Cuts the supply at once'],
  },
  {
    id: 'voltmeter',
    label: 'Voltmeter (VL)',
    description: 'Reads the line voltage VL between two lines. Read it at every observation.',
    specs: ['Reads VL in volts', 'Connected across two lines'],
  },
  {
    id: 'ammeter',
    label: 'Ammeter (IL)',
    description: 'In one supply line. Reads the line current IL, which rises with the load.',
    specs: ['Reads IL in amperes', 'Rated current 4.5 A (illustrative)'],
  },
  {
    id: 'wattmeter_w1',
    label: 'Wattmeter W1',
    description:
      'Current coil in line 1, pressure coil across lines 1 and 3. Reads part of the input power. Can read negative at low power factor.',
    specs: ['Reads W1 in watts', 'Two-wattmeter method'],
  },
  {
    id: 'wattmeter_w2',
    label: 'Wattmeter W2',
    description:
      'Current coil in line 2, pressure coil across lines 2 and 3. With a balanced load its reading goes negative when the power factor is below 0.5. Reverse the pressure coil and record the reading as negative.',
    specs: ['Reads W2 in watts, can be negative', 'Negative below power factor 0.5 (balanced load)'],
  },
  {
    id: 'speed_sensor',
    label: 'Tachometer (N)',
    description: 'Measures the shaft speed N in rpm at the shaft end.',
    specs: ['Reads N in rpm', 'Synchronous speed 1500 rpm'],
  },
];

const STAGES: ProcedureStage[] = [
  {
    id: 'intro',
    title: 'Introduction',
    text: 'Read the aim and the theory. You will load a three-phase induction motor and record speed, currents, wattmeter readings and torque at each load.',
  },
  {
    id: 'apparatus',
    title: 'Apparatus',
    text: 'Check the apparatus list and the nameplate: 2.2 kW, 415 V, 4.5 A, 1440 rpm, 4 poles, 50 Hz. These ratings are illustrative.',
  },
  {
    id: 'circuit',
    title: 'Circuit connection',
    text: 'Connect the circuit as shown in the approved wiring diagram. Two wattmeters measure the input power, the ammeter is in one line and the voltmeter is across two lines. Get the connections checked before the supply is switched on.',
  },
  {
    id: 'safety',
    title: 'Safety checks',
    text: 'Acknowledge every safety item. The run button stays locked until all of them are acknowledged.',
  },
  {
    id: 'no_load',
    title: 'No-load test',
    text: 'Switch on the supply and start the motor with no load on the brake. Record VL, IL, W1, W2 and the speed N. The motor draws a small current and runs close to synchronous speed.',
  },
  {
    id: 'loading',
    title: 'Loading',
    text: 'Increase the load in equal steps by adding load to the brake. At each step record VL, IL, W1, W2, S1, S2 and N. Do not exceed the rated current of the motor.',
  },
  {
    id: 'unload',
    title: 'Unloading and shutdown',
    text: 'Release the load to zero, then switch off the supply. Wait for the rotor to stop before you touch the brake drum or the shaft.',
  },
  {
    id: 'analyse',
    title: 'Analysis',
    text: 'For each row calculate slip, torque, output power, input power, power factor and efficiency. Plot efficiency, power factor, speed, current and torque against output power, and slip against output power.',
  },
  {
    id: 'viva',
    title: 'Viva',
    text: 'Answer the viva questions on the two-wattmeter method, the slip and rotor frequency, and the effect of load on speed and current.',
  },
  {
    id: 'report',
    title: 'Report',
    text: 'Write the observation table, the graphs and one sample calculation. Comment on the characteristics and list the sources of error.',
  },
];

export const INDUCTION_MOTOR: ExperimentInfo = {
  id: 'induction-motor',
  title: 'Load test on a three-phase induction motor',
  aim: 'To conduct a load test on a three-phase squirrel-cage induction motor and find its performance: speed, slip, torque, output power, input power, power factor and efficiency, using the two-wattmeter method.',
  apparatus: [
    'Three-phase squirrel-cage induction motor, 2.2 kW, 415 V, 4.5 A, 1440 rpm, 4 poles (illustrative nameplate)',
    'Three-phase supply with isolator and starter',
    'Voltmeter across two lines, ammeter in one line',
    'Two wattmeters W1 and W2 (two-wattmeter method)',
    'Tachometer for the shaft speed',
    'Rope brake: drum radius 120 mm, belt thickness 12 mm, spring balances S1 and S2 (S2 tare 1 kg)',
    'Dead weights up to 40 kg',
    'Emergency stop on the supply panel',
  ],
  theory: [
    'A three-phase induction motor has a stator winding fed by a balanced three-phase supply. The stator currents produce a magnetic field that turns at the synchronous speed, Ns = 120 f / P. At 50 Hz and 4 poles this is 1500 rpm.',
    'The squirrel-cage rotor runs slightly slower than the field. The relative speed induces currents in the rotor bars, and the torque comes from those currents. Slip is s = (Ns - N) / Ns. At rated load the slip is typically a few per cent.',
    'In the test the motor drives a rope brake. The shaft torque is T = g (S1 - S2)(R + t/2), with S1 and S2 in kg, R the drum radius and t the belt thickness. The output power is P_out = 2 pi N T / 60.',
    'The input is measured with two wattmeters. The total input power is W1 + W2, where either reading can be negative. For a balanced load, the power factor is pf = P_in / (sqrt(3) V_L I_L), and the wattmeter readings are W1 = V I cos(30 deg - phi) and W2 = V I cos(30 deg + phi), with phi = acos(pf).',
    'Efficiency is eta = 100 P_out / P_in. Losses are a constant part (iron and friction and windage) and a part that rises with load. The simulator in this lab uses a simplified model with illustrative nameplate values. Its readings are simulated and are labelled as such wherever they appear.',
  ],
  nameplate: NAMEPLATE,
  brake: BRAKE,
  components: COMPONENTS,
  stages: STAGES,
  safetyChecks: [
    'The supply is off and the isolator is open while I connect or change the circuit.',
    'I know where the emergency stop is and I will press it if the motor or the load behaves abnormally.',
    'I have checked the connections against the approved wiring diagram and the instructor has checked them.',
    'I will keep hands, hair and loose clothing away from the shaft, the belt and the fan.',
    'I will not exceed the rated current of the motor, and I will not load the brake beyond its rating.',
    'I will switch off the supply and wait for the motor to stop before I touch the brake drum or the rotor.',
  ],
  references: [
    {
      title: 'Load test on a three-phase induction motor',
      source: 'AVIT, Electrical Machines II laboratory manual',
      note: 'Lab procedure and observation table. Follow the copy issued in the lab for the exact steps and the approved wiring.',
    },
    {
      title: 'Electrical Machinery',
      source: 'P. S. Bimbhra, Khanna Publishers',
      note: 'Three-phase induction motor chapters: slip, torque and performance.',
    },
    {
      title: 'Electric Machines',
      source: 'I. J. Nagrath and D. P. Kothari, Tata McGraw-Hill',
      note: 'Induction motor performance, slip and the equivalent circuit.',
    },
  ],
};
