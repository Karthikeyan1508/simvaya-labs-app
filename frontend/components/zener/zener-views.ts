export type Vec3 = [number, number, number];

// Camera presets. The camera looks at `focus` from direction `dir`; the distance fits a sphere of `radius` (metres)
// in the canvas whatever its aspect ratio. Same scheme as the Pelton views.
export interface ZenerView {
  dir: Vec3;
  focus: Vec3;
  radius: number;
}

const CENTRE: Vec3 = [0.05, 0.2, -0.15];

export const ZENER_VIEWS = {
  iso: { dir: [-0.2, 0.7, 1], focus: CENTRE, radius: 2.9 },
  front: { dir: [0, 0.25, 1], focus: CENTRE, radius: 2.6 },
  top: { dir: [0, 1, 0.35], focus: CENTRE, radius: 2.6 },
  side: { dir: [1, 0.3, 0], focus: CENTRE, radius: 3.0 },
  meters: { dir: [-0.1, 0.25, 1], focus: [0.8, 0.3, 0.3], radius: 1.4 },
  regulator: { dir: [0.3, 0.4, 1], focus: [1.2, 0.1, -0.3], radius: 1.0 },
  supply: { dir: [-0.3, 0.4, 1], focus: [-1.7, 0.2, -0.3], radius: 1.0 },
  rheostat: { dir: [0, 0.35, 1], focus: [-0.3, 0.15, -0.9], radius: 1.0 },
} satisfies Record<string, ZenerView>;

export type ZenerViewName = keyof typeof ZENER_VIEWS;

export const ZENER_VIEW_NAMES = Object.keys(ZENER_VIEWS) as ZenerViewName[];

export const ZENER_VIEW_LABEL: Record<ZenerViewName, string> = {
  iso: 'Overview',
  front: 'Front',
  top: 'Top',
  side: 'Side',
  meters: 'Meters',
  regulator: 'Zener & Rs',
  supply: 'Supply',
  rheostat: 'Rheostat',
};
