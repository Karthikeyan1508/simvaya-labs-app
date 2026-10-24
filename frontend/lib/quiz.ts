// Draft quiz content for Experiment 08. Check the wording with the course faculty before use.

export interface Question {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

export const PRETEST: Question[] = [
  {
    q: 'A Pelton wheel is which type of turbine?',
    options: ['Reaction turbine', 'Impulse turbine', 'Propeller turbine', 'Kaplan turbine'],
    answer: 1,
    why: 'The jet hits the buckets at atmospheric pressure. All the head is turned into velocity in the nozzle.',
  },
  {
    q: 'In the nozzle of a Pelton turbine, pressure head is converted into:',
    options: ['Torque', 'Jet kinetic energy', 'Heat', 'Shaft speed'],
    answer: 1,
    why: 'The nozzle makes a high-velocity jet. Its velocity is Cv x sqrt(2gH).',
  },
  {
    q: 'Brake horsepower is the power at the shaft. It is found from:',
    options: ['Torque x angular speed', 'rho g Q H', 'Head x area', 'Pressure x time'],
    answer: 0,
    why: 'BHP = 2 pi N tau / 60, where tau is the brake torque.',
  },
  {
    q: 'The net load on the brake is T = T1 + T0 - T2. What does T2 represent?',
    options: ['Dead weights', 'Hanger weight', 'Spring balance reading', 'Torque'],
    answer: 2,
    why: 'T2 is the tension read on the spring balance.',
  },
  {
    q: 'The efficiency of the turbine is eta =',
    options: ['BHP / IHP x 100', 'IHP / BHP x 100', 'Q / H', 'H / Q'],
    answer: 0,
    why: 'Efficiency is the brake power divided by the input (water) power.',
  },
];

export const POSTTEST: Question[] = [
  {
    q: 'The venturi discharge at head H (m) is approximately:',
    options: ['Q = 0.0055 sqrt(H) m3/s', 'Q = 0.0055 H m3/s', 'Q = 0.0055 H^2 m3/s', 'Q = 0.0055 / sqrt(H) m3/s'],
    answer: 0,
    why: 'Manual relation: Qact = 0.0055 sqrt(H), with H in metres.',
  },
  {
    q: 'At a fixed nozzle opening, why does efficiency against BHP look like a straight line?',
    options: ['Torque is constant', 'Input power IHP is constant', 'Speed is constant', 'Head is zero'],
    answer: 1,
    why: 'eta = BHP / IHP. With flow and head fixed, IHP is fixed, so eta is proportional to BHP.',
  },
  {
    q: 'Opening the nozzle from 1/8 to 8/8 at a fixed head mainly increases:',
    options: ['Head', 'Discharge Qact', 'Venturi throat pressure', 'Dead weight'],
    answer: 1,
    why: 'A larger opening lets more water through, so the discharge rises.',
  },
  {
    q: 'The efficiency peak of a Pelton turbine occurs at a load that is about:',
    options: ['A tenth of stall load', 'Half of stall load', 'Equal to stall load', 'Zero load'],
    answer: 1,
    why: 'With a linear speed-torque droop, brake power is highest at half stall, where the efficiency peaks.',
  },
  {
    q: 'In this rig, the head at turbine inlet Hi = Pi / W is taken from:',
    options: ['A fourth gauge', 'The penstock gauge Pp', 'A zero reading', 'The throat gauge P1'],
    answer: 1,
    why: 'The rig has one inlet gauge, so Pi is taken as Pp.',
  },
];
