// Lab text for the Zener voltage regulator experiment. Plain data, shared by the page and the tests.

export const ZENER_AIM =
  'Use a Zener diode as a shunt voltage regulator, and observe how the output voltage changes with the load and the input voltage.';

export const ZENER_OBJECTIVES = [
  'Build the shunt regulator: series resistor, Zener in reverse bias, load across the Zener.',
  'Vary the input voltage and the load, and read the output voltage across the load.',
  'Calculate the Zener current and the Zener power dissipation for each reading.',
  'Plot the output voltage and the Zener current against the input voltage.',
];

export const ZENER_APPARATUS = [
  'Zener diode, 5.1 V (e.g. 1N4733A)',
  'Series resistor Rs, 220 Ω, 0.25 W',
  'Variable DC supply, 0 to 15 V',
  'Load resistor RL, 1 kΩ (also 470 Ω and 220 Ω)',
  'Digital multimeter',
  'Connecting wires and breadboard or PCB',
];

export const ZENER_THEORY = [
  'A Zener diode is a heavily doped p-n junction designed to work in the reverse breakdown region. When the reverse voltage reaches its Zener voltage Vz, it holds a nearly constant voltage across itself, even when the input voltage or the load current changes, within limits.',
  'In a shunt regulator the Zener is connected in reverse bias across the load. The series resistor Rs limits the current through the Zener and carries the difference between the supply and the output. Only the Zener current changes when the load changes, so the output stays at Vz.',
  'The regulator works only while the Zener conducts. Below the Zener voltage the output follows the voltage divider Rs and RL. The Zener power Vz x Iz must stay below its rating, and the series resistor must be able to carry the total current.',
];

export const ZENER_REFERENCES = [
  {
    title: 'Zener Diode as Voltage Regulator, Laboratory Manual, Experiment 06',
    source: 'Basic Electronics / Electronic Devices lab manual (this course)',
    note: 'Aim, apparatus, circuit, procedure, working formulas and precautions for this experiment.',
  },
  {
    title: '1N4733A Zener diode, product listing',
    source: 'Components101',
    note: 'Nominal 5.1 V, 1 W rating. The listed maximum Zener current differs from other sources; check the official onsemi datasheet.',
  },
  {
    title: '1N4733A Zener diode, distributor listing',
    source: 'Element14 (Multicomp Pro)',
    note: 'Test current 49 mA, ±5 % tolerance.',
  },
];

// The manual's sample Iz values for RL = 470 and 220 Ω rise as the load gets heavier. With Iz = (Vs - Vz)/Rs - IL
// the Zener current falls as the load current rises, so this lab uses the formula. Shown in Calculations.
export const MANUAL_NOTE =
  'The manual sample table lists Iz rising as RL falls (85.6 mA at 470 Ω, 132.4 mA at 220 Ω). The formula Iz = (Vs - Vz)/Rs - IL gives less Zener current as the load gets heavier, so this lab uses the formula.';

// Parts on the bench. The ids tag the 3D parts, the labels and the highlights.
export const ZENER_PARTS: { id: string; label: string; description: string; specs: string[] }[] = [
  {
    id: 'supply',
    label: 'DC supply',
    description: 'Variable DC source. Sets the input voltage Vs at the series resistor.',
    specs: ['0 to 15 V', 'Set with the supply slider in the control desk'],
  },
  {
    id: 'rheostat',
    label: 'Rheostat RL',
    description: 'Load resistance. A lower RL draws more load current, so less current is left for the Zener.',
    specs: ['100 Ω to 2 kΩ', 'Presets: no load, 1 kΩ, 470 Ω, 220 Ω'],
  },
  {
    id: 'resistor',
    label: 'Series resistor Rs',
    description: 'Limits the current through the Zener and the load. Carries the whole supply current.',
    specs: ['220 Ω, 0.25 W', 'At 15 V the total current gives about 0.45 W, above the rating'],
  },
  {
    id: 'zener',
    label: 'Zener diode',
    description: 'Reverse biased, cathode to the output node. Holds Vout at its Zener voltage while it conducts.',
    specs: ['1N4733A, Vz 5.1 V ±5 %', '1 W maximum, test current 49 mA'],
  },
  {
    id: 'vs_meter',
    label: 'Voltmeter Vs',
    description: 'Across Rs: the voltage the series resistor drops, Vs = Vin − Vout.',
    specs: ['0 to 15 V', 'Read the needle on the scale'],
  },
  {
    id: 'vout_meter',
    label: 'Voltmeter Vout',
    description: 'Across the load and the Zener: the regulated output.',
    specs: ['0 to 15 V', 'Vout = Vz while regulating'],
  },
  {
    id: 'ammeter',
    label: 'Ammeter Iz',
    description: 'In series with the Zener branch. Reads the Zener current.',
    specs: ['0 to 100 mA', 'Iz = (Vs − Vz) / Rs − IL'],
  },
  {
    id: 'switch',
    label: 'Supply switch',
    description: 'Opens or closes the supply. With the switch open every meter reads zero.',
    specs: ['ON / OFF'],
  },
];

// The eight manual steps, each with the parts it asks you to look at (the bench highlights them).
export const ZENER_STEPS: { text: string; highlight: string[] }[] = [
  { text: 'Set up the circuit as shown in Fig. 1 and read the meters.', highlight: ['supply', 'rheostat', 'resistor', 'zener'] },
  { text: 'Connect the DC supply and close the switch.', highlight: ['switch', 'supply'] },
  { text: 'Measure the output voltage across the load with the voltmeter.', highlight: ['vout_meter'] },
  { text: 'Vary the input voltage (8, 10, 12, 15 V) and note the output.', highlight: ['supply', 'vs_meter'] },
  { text: 'Change the load: 1 kΩ, 470 Ω, 220 Ω, and observe the output.', highlight: ['rheostat'] },
  { text: 'Record the readings in a table.', highlight: ['vs_meter', 'vout_meter', 'ammeter'] },
  { text: 'Calculate the Zener current, power and regulation.', highlight: ['ammeter', 'zener'] },
  { text: 'Plot the graphs and analyse the results.', highlight: [] },
];
