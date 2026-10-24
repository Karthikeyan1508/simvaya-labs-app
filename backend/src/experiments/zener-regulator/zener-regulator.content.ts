// Viva facts for the Zener voltage regulator lab. Copied from frontend lib/zener/content.ts and
// components/zener/zener-parts.ts. Keep the text in step with those files.
// shortcut: hand-copied, not shared with the frontend, upgrade by moving the lab text into one shared JSON file.

export const ZENER_REGULATOR = {
  id: 'zener-regulator',
  title: 'Zener diode as voltage regulator',
  aim: 'Use a Zener diode as a shunt voltage regulator, and observe how the output voltage changes with the load and the input voltage.',
  theory: [
    'A Zener diode is a heavily doped p-n junction designed to work in the reverse breakdown region. When the reverse voltage reaches its Zener voltage Vz, it holds a nearly constant voltage across itself, even when the input voltage or the load current changes, within limits.',
    'In a shunt regulator the Zener is connected in reverse bias across the load. The series resistor Rs limits the current through the Zener and carries the difference between the supply and the output. Only the Zener current changes when the load changes, so the output stays at Vz.',
    'The regulator works only while the Zener conducts. Below the Zener voltage the output follows the voltage divider Rs and RL. The Zener power Vz x Iz must stay below its rating, and the series resistor must be able to carry the total current.',
  ],
  // Procedure steps in order. The step number is the index plus one.
  steps: [
    'Set up the circuit as shown in Fig. 1 and read the meters.',
    'Connect the DC supply and close the switch.',
    'Measure the output voltage across the load with the voltmeter.',
    'Vary the input voltage (8, 10, 12, 15 V) and note the output.',
    'Change the load: 1 kΩ, 470 Ω, 220 Ω, and observe the output.',
    'Record the readings in a table.',
    'Calculate the Zener current, power and regulation.',
    'Plot the graphs and analyse the results.',
  ],
  components: [
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
  ],
  // Nominal values from the lab. Vz is the Zener voltage, Rs the series resistor, and the procedure's inputs and loads.
  vz: 5.1,
  rsOhm: 220,
  inputsV: [8, 10, 12, 15],
  loadsOhm: [1000, 470, 220],
  formulas: [
    { label: 'Zener current', formula: 'Iz = (Vs − Vz) / Rs − IL' },
    { label: 'voltage across Rs', formula: 'Vs = Vin − Vout' },
    { label: 'Zener power', formula: 'Pz = Vz x Iz' },
  ],
};
