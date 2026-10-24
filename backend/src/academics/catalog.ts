// Draft syllabus for Mechanical Engineering. Replace with the college's official subject list.

export interface ExperimentEntry {
  id: string;
  no: number;
  title: string;
  available: boolean;
}

export interface SubjectEntry {
  id: string;
  name: string;
  lab: boolean;
  experiments: ExperimentEntry[];
}

const labExperiments = (prefix: string, count: number, available: Record<number, string>): ExperimentEntry[] =>
  Array.from({ length: count }, (_, i) => {
    const no = i + 1;
    return available[no]
      ? { id: available[no], no, title: prefix, available: true }
      : { id: `${prefix.toLowerCase().replace(/\W+/g, '-')}-${no}`, no, title: `Experiment ${no}`, available: false };
  });

export const SEMESTERS: { number: number; subjects: SubjectEntry[] }[] = [
  {
    number: 1,
    subjects: [
      { id: 'eng-maths-1', name: 'Engineering Mathematics I', lab: false, experiments: [] },
      { id: 'eng-physics', name: 'Engineering Physics', lab: false, experiments: [] },
      { id: 'basic-electrical', name: 'Basic Electrical Engineering', lab: false, experiments: [] },
      { id: 'eng-graphics', name: 'Engineering Graphics', lab: false, experiments: [] },
      { id: 'c-programming', name: 'Programming in C', lab: false, experiments: [] },
    ],
  },
  {
    number: 2,
    subjects: [
      { id: 'eng-maths-2', name: 'Engineering Mathematics II', lab: false, experiments: [] },
      { id: 'eng-mechanics', name: 'Engineering Mechanics', lab: false, experiments: [] },
      { id: 'basic-electronics', name: 'Basic Electronics', lab: false, experiments: [] },
      { id: 'eng-materials', name: 'Engineering Materials', lab: false, experiments: [] },
      { id: 'workshop', name: 'Workshop Practice', lab: true, experiments: labExperiments('Workshop Practice', 4, {}) },
    ],
  },
  {
    number: 3,
    subjects: [
      { id: 'eng-maths-3', name: 'Engineering Mathematics III', lab: false, experiments: [] },
      { id: 'strength-materials', name: 'Strength of Materials', lab: false, experiments: [] },
      { id: 'thermodynamics', name: 'Thermodynamics', lab: false, experiments: [] },
      { id: 'fluid-mechanics', name: 'Fluid Mechanics', lab: false, experiments: [] },
      {
        id: 'som-lab',
        name: 'Strength of Materials Lab',
        lab: true,
        experiments: labExperiments('Strength of Materials', 6, {}),
      },
    ],
  },
  {
    number: 4,
    subjects: [
      { id: 'kinematics', name: 'Kinematics of Machines', lab: false, experiments: [] },
      { id: 'heat-transfer', name: 'Heat Transfer', lab: false, experiments: [] },
      { id: 'machine-drawing', name: 'Machine Drawing', lab: false, experiments: [] },
      { id: 'numerical-methods', name: 'Numerical Methods', lab: false, experiments: [] },
      { id: 'materials-lab', name: 'Materials Testing Lab', lab: true, experiments: labExperiments('Materials Testing', 6, {}) },
    ],
  },
  {
    number: 5,
    subjects: [
      { id: 'dynamics', name: 'Dynamics of Machines', lab: false, experiments: [] },
      { id: 'machine-design-1', name: 'Design of Machine Elements', lab: false, experiments: [] },
      { id: 'metrology', name: 'Metrology and Measurements', lab: false, experiments: [] },
      { id: 'hydraulic-machines', name: 'Hydraulic Machines', lab: false, experiments: [] },
      { id: 'cad-cam', name: 'CAD and CAM', lab: false, experiments: [] },
    ],
  },
  {
    number: 6,
    subjects: [
      { id: 'heat-transfer-2', name: 'Heat and Mass Transfer', lab: false, experiments: [] },
      { id: 'machine-design-2', name: 'Machine Design II', lab: false, experiments: [] },
      { id: 'control-systems', name: 'Control Systems', lab: false, experiments: [] },
      { id: 'industrial-eng', name: 'Industrial Engineering', lab: false, experiments: [] },
      {
        id: 'fluid-machinery-lab',
        name: 'Fluid Machinery Lab',
        lab: true,
        experiments: labExperiments('Fluid Machinery', 10, { 8: 'pelton-wheel' }),
      },
    ],
  },
  {
    number: 7,
    subjects: [
      { id: 'refrigeration', name: 'Refrigeration and Air Conditioning', lab: false, experiments: [] },
      { id: 'fea', name: 'Finite Element Analysis', lab: false, experiments: [] },
      { id: 'mechatronics', name: 'Mechatronics', lab: false, experiments: [] },
      { id: 'elective-1', name: 'Elective I', lab: false, experiments: [] },
      { id: 'project-1', name: 'Project Phase I', lab: false, experiments: [] },
    ],
  },
  {
    number: 8,
    subjects: [
      { id: 'power-plant', name: 'Power Plant Engineering', lab: false, experiments: [] },
      { id: 'automobile', name: 'Automobile Engineering', lab: false, experiments: [] },
      { id: 'elective-2', name: 'Elective II', lab: false, experiments: [] },
      { id: 'project-2', name: 'Project Phase II', lab: false, experiments: [] },
      { id: 'internship', name: 'Internship', lab: false, experiments: [] },
    ],
  },
];
