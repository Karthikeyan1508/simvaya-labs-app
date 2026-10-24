import { Building2, CircuitBoard, Cog, Cpu, type LucideIcon, Zap } from 'lucide-react';

export interface DemoExperiment {
  title: string;
  summary: string;
  // Set only for experiments that run in the lab today.
  href?: string;
}

export interface DemoDiscipline {
  name: string;
  icon: LucideIcon;
  experiment: DemoExperiment;
}

// Draft catalogue for the demo: one experiment per discipline. The Pelton wheel turbine and the sorting visualiser run today.
export const DEMO: DemoDiscipline[] = [
  {
    name: 'Computer Science',
    icon: Cpu,
    experiment: {
      title: 'Sorting algorithm visualiser',
      summary: 'Quick sort step by step: pivot, partition and swaps.',
      href: '/experiments/sorting-visualiser',
    },
  },
  {
    name: 'Electronics',
    icon: CircuitBoard,
    experiment: {
      title: 'Zener diode as voltage regulator',
      summary: 'Shunt regulator: hold the output at 5.1 V across changing input and load.',
      href: '/experiments/zener-regulator',
    },
  },
  {
    name: 'Electrical',
    icon: Zap,
    experiment: {
      title: 'Three-phase induction motor load test',
      summary: 'Slip, torque, efficiency and power factor from the wattmeter readings.',
      href: '/experiments/induction-motor',
    },
  },
  {
    name: 'Civil',
    icon: Building2,
    experiment: { title: 'Concrete compressive strength', summary: 'Cube test results and strength over curing days.' },
  },
  {
    name: 'Mechanical',
    icon: Cog,
    experiment: {
      title: 'Performance characteristics of a Pelton turbine',
      summary: 'Brake power, input power and efficiency across loads.',
      href: '/experiments/pelton-wheel',
    },
  },
];
