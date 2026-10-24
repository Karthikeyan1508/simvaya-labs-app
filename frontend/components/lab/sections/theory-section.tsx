import { SectionHead } from '../section-head';

export function Eq({ label, expr, note }: { label: string; expr: string; note?: string }) {
  return (
    <div className="rounded-md bg-foreground/[0.035] p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="num mt-2 text-base">{expr}</p>
      {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function TheorySection() {
  return (
    <div className="space-y-10">
      <SectionHead title="Theory" subtitle="Principle, components and the equations used in this experiment." />

      <section className="max-w-3xl space-y-4 text-[15px] leading-relaxed">
        <h3 className="text-sm font-semibold">Principle</h3>
        <p>
          The Pelton wheel is an impulse turbine. A nozzle turns the pressure head of the water into a high-velocity
          jet. The jet strikes double-cup buckets on the runner at atmospheric pressure and gives up its momentum. The
          runner turns the shaft, and a brake drum loads it.
        </p>
        <p>
          The spear moves in and out of the nozzle orifice to vary the opening from 1/8 to 8/8. A venturimeter measures
          discharge from the pressure difference across its throat.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Equations</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Eq label="Venturi differential" expr="P = P2 − P1" note="kg/cm²" />
          <Eq label="Venturi head" expr="H = P / W" note="W = 1000 kg/m³, so H = 10 × P in metres" />
          <Eq label="Actual discharge" expr="Qact = 0.0055 √H" note="m³/s, with H in metres" />
          <Eq label="Head at penstock" expr="Hp = Pp / W" note="m" />
          <Eq label="Head at turbine inlet" expr="Hi = Pi / W" note="m, here Pi = Pp" />
          <Eq label="Net load" expr="T = T1 + T0 − T2" note="T0 = 1 kg hanger, T1 dead weights, T2 spring balance" />
          <Eq label="Brake torque" expr="τ = T × g × D / 2" note="D = 0.415 m, drum with rope" />
          <Eq label="Brake horsepower" expr="BHP = 2π N τ / 60" note="N in rpm, result in W, shown in kW" />
          <Eq label="Input power" expr="IHP = ρ g Qact Hi" note="ρ = 1000 kg/m³" />
          <Eq label="Efficiency" expr="η = BHP / IHP × 100" note="%" />
        </div>
      </section>

      <section className="max-w-3xl space-y-3 text-[15px] leading-relaxed">
        <h3 className="text-sm font-semibold">Reading the results</h3>
        <p>
          At a fixed nozzle opening the discharge and the input power are constant, so efficiency rises in proportion to
          brake power. The brake power itself peaks at about half the stall load, where the efficiency is highest. The
          load graphs in the Calculations section show this turn-over.
        </p>
      </section>
    </div>
  );
}
