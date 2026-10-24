import React from "react";
import { L, W, H, GuideStar, Fireflies, Rain, Snowfall, Cut, rng, lighten, darken } from "@papercut/paper";
import {
  Sky, Stars, Moon, Sun, Clouds, Mountains, Hills, Firs, BigTrunk, Rock, Ledge, Water, Glitter, Waterfall,
  Flower, Fern, Mushroom, Leaf, Berries, Icicles, Crystal, Aurora, StonePortal, Bridge, Waves,
} from "@papercut/world";
import { Fox } from "@papercut/fox";
import { IsoGate } from "@papercut/iso";
import { Callouts } from "@papercut/callout";
import { useUi } from "@papercut/ui";

import type { SceneProps } from "@papercut/film";
export type { SceneProps };

/** Foreground flower/rock clusters shared by several scenes. */
const Meadow: React.FC<{ t: number; x0: number; x1: number; y: number; seed: number; n?: number }> = ({ t, x0, x1, y, seed, n = 10 }) => {
  const r = rng(seed);
  const pet = ["#ffffff", "#ff5fa8", "#ffd23a", "#b84ee8", "#fff0c8"];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const k = Math.floor(r() * pet.length);
        const cone = k === 1 || k === 3;
        return (
          <Flower key={i} x={x0 + r() * (x1 - x0)} y={y + r() * 40} s={0.8 + r() * 1.1} petal={pet[k]} core={cone ? "#e8741c" : "#f3b21a"} kind={cone ? "cone" : "daisy"} t={t} seed={i} />
        );
      })}
    </>
  );
};

/* 1 ─ dusk meadow */
export const S1: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="1" top="#8d86d4" bot="#fbbf8e" />
    <Stars n={14} seed={3} t={t} ymax={120} color="#fff0c8" />
    <Sun x={930} y={380} r={34} t={t} />
    <L d={0.05} cam={cam} sh="s"><Clouds y={110} seed={4} n={4} a="#ffd9b8" b="#f4a2a0" t={t} /></L>
    <L d={0.1} cam={cam}><Mountains base={440} seed={9} count={6} hMin={140} hMax={250} lit="#9488dc" shade="#625bb4" snow snowLit="#fff5ee" snowShade="#d6c8e8" /></L>
    <L d={0.2} cam={cam}><Water y={420} bottom={470} deep="#8aa2e6" mid="#aebdf0" foam="#e9eeff" t={t} rows={3} amp={2} /></L>
    <L d={0.25} cam={cam}><Firs base={470} seed={5} count={40} size={0.55} lit="#2f6a58" shade="#1f4a45" /></L>
    <L d={0.35} cam={cam}><Hills base={500} amp={26} seed={2} color="#7fb336" hi="#a8d255" /></L>
    <L d={0.5} cam={cam}><Water y={560} bottom={H + 20} deep="#2f68c8" mid="#5b92e8" foam="#f2f8ff" t={t} rows={7} amp={5} /></L>
    <L d={0.6} cam={cam}><Bridge x0={110} x1={600} y={515} /></L>
    <Fox x={170 + p * 360} y={518} s={1.2} t={t} walk={0.7} look={-4} />
    <L d={1.1} cam={cam}>
      <Meadow t={t} x0={-20} x1={420} y={660} seed={1} n={12} />
      <Rock x={620} y={700} w={150} h={70} seed={4} />
      <Rock x={820} y={720} w={190} h={90} seed={7} lit="#6f685c" shade="#3f3a33" />
      <Rock x={1100} y={730} w={170} h={80} seed={11} />
    </L>
    <GuideStar x={520} y={96} r={14} t={t} />
  </>
);

/* 2 ─ night river */
export const S2: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="2" top="#0c1544" bot="#33498a" />
    <Stars n={40} seed={8} t={t} />
    <L d={0.03} cam={cam}><Moon x={1090} y={120} r={52} /></L>
    <L d={0.05} cam={cam} sh="s"><Clouds y={120} seed={6} n={3} a="#f3ebd2" b="#b9b7cf" t={t} /></L>
    <L d={0.1} cam={cam}><Mountains base={420} seed={21} count={5} hMin={150} hMax={260} lit="#7d86c8" shade="#454e92" snow snowLit="#f6f8ff" snowShade="#b8c4ea" /></L>
    <L d={0.2} cam={cam}><Hills base={430} amp={30} seed={3} color="#2e6a4e" hi="#3f8a5e" /></L>
    <L d={0.25} cam={cam}><Firs base={450} seed={3} count={46} size={0.6} lit="#1d4a44" shade="#12302f" /></L>
    <L d={0.45} cam={cam}><Water y={470} bottom={H + 20} deep="#1f3f9e" mid="#3f6fe0" foam="#cfe0ff" t={t} rows={8} amp={5} /></L>
    <L d={0.45} cam={cam}><Glitter x={1000} y0={480} y1={650} t={t} /></L>
    <L d={0.6} cam={cam}><Rock x={760} y={560} w={120} h={60} seed={5} /><Rock x={940} y={600} w={150} h={70} seed={9} /><Rock x={1120} y={570} w={130} h={64} seed={12} /></L>
    <L d={0.8} cam={cam}><Ledge x0={40} x1={420} y={520} seed={3} /></L>
    <Fox x={240} y={516} s={1.25} t={t} look={-24} />
    <L d={1.2} cam={cam}>
      <Meadow t={t} x0={-20} x1={300} y={655} seed={5} n={9} />
      <Fern x={470} y={730} s={1.2} ang={10} t={t} lit="#4f9a38" shade="#2f6a2a" />
      <Rock x={560} y={740} w={170} h={90} seed={2} />
    </L>
    <GuideStar x={760} y={190} r={18} t={t} />
  </>
);

/* 3 ─ firefly forest */
export const S3: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="3" top="#06101c" bot="#14383a" />
    <L d={0.1} cam={cam}><Firs base={430} seed={31} count={40} size={0.9} lit="#14403a" shade="#0c2a28" /></L>
    <L d={0.2} cam={cam}><Firs base={480} seed={32} count={24} size={1.3} lit="#17493e" shade="#0e302b" /></L>
    <L d={0.3} cam={cam}><Water y={470} bottom={H + 20} deep="#14398f" mid="#2f63d0" foam="#bcd6ff" t={t} rows={7} amp={4} /></L>
    <L d={0.35} cam={cam}><Waterfall x={640} y0={440} y1={480} w={40} t={t} /></L>
    <L d={0.5} cam={cam}><Rock x={430} y={640} w={160} h={80} seed={3} moss="#9aa22e" /><Rock x={880} y={620} w={140} h={70} seed={8} moss="#9aa22e" /></L>
    <L d={0.7} cam={cam}><Ledge x0={150} x1={560} y={565} seed={14} lit="#6e665c" shade="#403a34" cap="#7f9a2f" /></L>
    <Fox x={380} y={560} s={1.25} t={t} look={-22} />
    <L d={1.0} cam={cam}>
      <BigTrunk x={-40} w={190} seed={1} lean={-10} />
      <BigTrunk x={1010} w={120} seed={2} />
      <BigTrunk x={1150} w={170} seed={3} lean={12} />
      <Fern x={190} y={600} s={1.4} ang={-30} t={t} lit="#6bb23a" shade="#356f2a" seed={1} />
      <Fern x={650} y={700} s={1.2} ang={20} t={t} lit="#6bb23a" shade="#356f2a" seed={2} />
      <Fern x={1010} y={690} s={1.5} ang={-20} t={t} lit="#6bb23a" shade="#356f2a" seed={3} />
      <Mushroom x={120} y={680} s={1.7} />
      <Mushroom x={300} y={720} s={1.0} />
      <Mushroom x={1030} y={690} s={1.5} />
      <Mushroom x={1190} y={650} s={0.8} />
      <Flower x={420} y={720} s={1.1} petal="#ffffff" core="#f3b21a" t={t} seed={2} />
      <Flower x={880} y={730} s={1.0} petal="#b84ee8" core="#e8741c" kind="cone" t={t} seed={4} />
    </L>
    <GuideStar x={830} y={140} r={16} t={t} />
    <Callouts t={t} items={[
      { label: "Guiding star", x: 830, y: 140 },
      { label: "Redwood trunk", x: 1060, y: 330 },
      { label: "Red fox", x: 390, y: 470 },
      { label: "Fly agaric", x: 1030, y: 620 },
    ]} />
    <Fireflies n={38} seed={4} t={t} y0={80} y1={620} />
  </>
);

/* 4 ─ waterfall cliffs */
export const S4: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="4" top="#0c1646" bot="#2f4580" />
    <Stars n={34} seed={12} t={t} />
    <L d={0.03} cam={cam}><Moon x={170} y={110} r={44} /></L>
    <L d={0.05} cam={cam} sh="s"><Clouds y={110} seed={12} n={3} a="#f3ebd2" b="#b0b0cc" t={t} /></L>
    <L d={0.1} cam={cam}><Mountains base={400} seed={41} count={6} hMin={150} hMax={260} lit="#8a8fd0" shade="#4a529a" snow snowLit="#f4f6ff" snowShade="#b6c2ea" /></L>
    <L d={0.2} cam={cam}><Firs base={420} seed={42} count={50} size={0.6} lit="#1d4a44" shade="#12302f" /></L>
    <L d={0.3} cam={cam}><Water y={440} bottom={H + 20} deep="#1b3a96" mid="#3f6be0" foam="#cfe0ff" t={t} rows={7} amp={4} /></L>
    <L d={0.4} cam={cam}>
      <Waterfall x={300} y0={270} y1={470} w={46} t={t} />
      <Waterfall x={620} y0={330} y1={470} w={54} t={t} />
    </L>
    <L d={0.4} cam={cam}><Ledge x0={-60} x1={300} y={270} bottom={560} seed={51} cap="#a8a830" /></L>
    <L d={0.5} cam={cam}><Ledge x0={440} x1={640} y={330} bottom={520} seed={52} cap="#a8a830" /><Ledge x0={800} x1={1100} y={300} bottom={470} seed={53} cap="#a8a830" /></L>
    <L d={0.6} cam={cam}><Rock x={900} y={620} w={150} h={70} seed={4} /><Rock x={1100} y={610} w={130} h={60} seed={6} /></L>
    <L d={0.8} cam={cam}><Ledge x0={60} x1={520} y={540} seed={54} cap="#b0ae32" /></L>
    <Fox x={290} y={535} s={1.3} t={t} look={-14} />
    <L d={1.2} cam={cam}>
      <Meadow t={t} x0={-20} x1={380} y={650} seed={9} n={9} />
      <Berries x={470} y={730} s={1.3} seed={3} />
      <Berries x={540} y={740} s={1.0} seed={5} />
      <Rock x={620} y={745} w={190} h={90} seed={3} />
    </L>
    <GuideStar x={990} y={160} r={16} t={t} />
  </>
);

/* 5 ─ snowy summit */
export const S5: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="5" top="#0b1846" bot="#3a4d88" />
    <Stars n={34} seed={15} t={t} />
    <L d={0.05} cam={cam} sh="s"><Clouds y={90} seed={15} n={3} a="#eeeaf4" b="#aab0d0" t={t} /></L>
    <L d={0.08} cam={cam}><Mountains base={470} seed={61} count={3} hMin={220} hMax={300} lit="#7c88cc" shade="#424c92" snow snowLine={0.5} snowLit="#ffffff" snowShade="#bcc8ee" x0={300} x1={1360} /></L>
    <L d={0.12} cam={cam}><Mountains base={480} seed={62} count={5} hMin={90} hMax={180} lit="#6a74b8" shade="#3a4382" snow snowLit="#f2f5ff" snowShade="#aab6e0" /></L>
    <L d={0.25} cam={cam}><Water y={440} bottom={H + 20} deep="#1a3c8c" mid="#3a66d8" foam="#d6e4ff" t={t} rows={6} amp={3} /></L>
    <L d={0.3} cam={cam}><Firs base={500} seed={63} count={22} size={1.0} lit="#1f5048" shade="#123430" x0={-40} x1={420} /></L>
    <L d={0.5} cam={cam}><Ledge x0={-30} x1={260} y={560} seed={64} snow lit="#7e766a" shade="#4a443b" /></L>
    <L d={0.7} cam={cam}><Ledge x0={300} x1={800} y={490} seed={65} snow lit="#7e766a" shade="#4a443b" /></L>
    <Fox x={400 + p * 230} y={488} s={1.25} t={t} walk={0.6} look={-20} />
    <L d={1.2} cam={cam}>
      <Rock x={820} y={680} w={230} h={110} seed={5} moss="#ffffff" />
      <Berries x={120} y={730} s={1.4} seed={1} />
      <Flower x={230} y={720} s={1.1} petal="#ffd23a" core="#e8741c" t={t} seed={1} />
      <Flower x={300} y={735} s={1.2} petal="#ffffff" core="#f3b21a" t={t} seed={2} />
    </L>
    <GuideStar x={900} y={150} r={20} t={t} />
    <Snowfall t={t} n={60} />
  </>
);

/* 6 ─ crystal cave */
export const S6: React.FC<SceneProps> = ({ t, p, cam }) => {
  const r = rng(77);
  const { xray } = useUi();
  return (
    <>
      <Sky id="6" top="#080f2a" bot="#18265a" />
      <L d={0.05} cam={cam}><Hills base={330} amp={70} seed={7} color="#15204a" hi="#202d62" /></L>
      <L d={0.1} cam={cam}>
        <circle cx={860} cy={250} r={190} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} />
        {[150, 120, 90, 62, 36].map((rad, i) => (
          <circle key={i} cx={860} cy={250} r={rad} fill={i % 2 ? "#f1b43a" : "#8a5a1a"} stroke="rgba(255,240,180,.3)" />
        ))}
      </L>
      <L d={0.2} cam={cam}>
        <Cut p={[[-40, -40], [W + 40, -40], [W + 40, 70], [-40, 70]]} fill="#101a3e" />
        <Icicles seed={3} color="#6fb4ff" />
      </L>
      <L d={0.3} cam={cam}><Water y={510} bottom={H + 20} deep="#14307e" mid="#2f5fd0" foam="#9cc8ff" t={t} rows={7} amp={3} /></L>
      <L d={0.3} cam={cam}><Glitter x={860} y0={520} y1={680} t={t} /></L>
      <L d={0.4} cam={cam}>
        {Array.from({ length: 9 }, (_, i) => (
          <Crystal key={i} x={420 + r() * 700} y={500 + r() * 30} w={26 + r() * 30} h={50 + r() * 60} tilt={(r() - 0.5) * 24} />
        ))}
        <Waterfall x={820} y0={400} y1={512} w={34} t={t} deep="#d9a93a" foam="#fff3c0" />
      </L>
      <L d={0.6} cam={cam}><Rock x={430} y={600} w={170} h={90} seed={3} lit="#5c5a66" shade="#34323e" /><Rock x={1000} y={620} w={190} h={110} seed={4} lit="#5c5a66" shade="#34323e" /></L>
      <L d={0.8} cam={cam}>
        <g opacity={xray}>
          <circle cx={300} cy={690} r={190} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} />
          {[[130, 56, 80, -14], [200, 70, 100, 6], [270, 84, 120, -4], [350, 66, 96, 10], [430, 52, 78, -8]].map(([x, w, h, tl], i) => (
            <Crystal key={i} x={x} y={722} w={w} h={h} tilt={tl} lit="#ffe9a8" shade="#e8a93a" />
          ))}
        </g>
        <g opacity={1 - 0.8 * xray}><Ledge x0={80} x1={520} y={600} seed={9} lit="#6a6874" shade="#3c3a48" cap="#8fb7e8" /></g>
      </L>
      <Fox x={330} y={596} s={1.3} t={t} look={-18} />
      <L d={1.2} cam={cam}>
        {[[40, 700, 90, 180, -8], [150, 740, 70, 120, 10], [1130, 720, 110, 220, 6], [1230, 700, 80, 140, -6], [560, 740, 60, 90, 0]].map(([x, y, w, h, tl], i) => (
          <Crystal key={i} x={x} y={y} w={w} h={h} tilt={tl} />
        ))}
      </L>
      <GuideStar x={860} y={250} r={16} t={t} glow={0.6} />
      <Callouts t={t} items={[
        { label: "Golden light", x: 860, y: 330 },
        { label: "Ice crystals", x: 1150, y: 570 },
        { label: "Guide fox", x: 330, y: 520 },
        { label: "Hidden geode", x: 300, y: 670, xray: true },
      ]} />
    </>
  );
};

/* 7 ─ storm at sea */
export const S7: React.FC<SceneProps> = ({ t, p, cam }) => {
  const flash = Math.max(0, 1 - Math.abs(t - 2.4) * 5) * 0.35 + Math.max(0, 1 - Math.abs(t - 2.7) * 7) * 0.2;
  return (
    <>
      <Sky id="7" top="#151a38" bot="#3a4468" />
      <L d={0.04} cam={cam}>
        <circle cx={880} cy={130} r={150} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} opacity={0.7} />
      </L>
      <L d={0.05} cam={cam} sh="s"><Clouds y={90} seed={71} n={5} a="#59618a" b="#363d5e" t={t} speed={10} size={1.5} /></L>
      <L d={0.07} cam={cam}><Clouds y={170} seed={72} n={4} a="#6b739a" b="#444c70" t={t} speed={14} size={1.2} /></L>
      <L d={0.1} cam={cam}><Mountains base={450} seed={73} count={4} hMin={110} hMax={190} lit="#7283b6" shade="#44507f" snow snowLit="#e6ecff" snowShade="#a2afd8" /></L>
      <L d={0.2} cam={cam}><Firs base={470} seed={74} count={30} size={0.7} lit="#1a3f42" shade="#0f2a2e" /></L>
      <L d={0.4} cam={cam}><Waves y={470} t={t} deep="#16336f" mid="#1f4a98" foam="#e4efff" /></L>
      <L d={0.7} cam={cam}><Ledge x0={200} x1={660} y={565} seed={75} lit="#6a655c" shade="#3c3832" cap="#8aa02e" /></L>
      <Fox x={450} y={560} s={1.25} t={t} look={-16} tailUp={-6} />
      <L d={1.2} cam={cam}>
        <Leaf x={60} y={730} s={1.5} ang={-24} lit="#8ac33a" shade="#4a8a2a" />
        <Leaf x={150} y={740} s={1.2} ang={8} lit="#7ab62e" shade="#3f7a24" />
        <Leaf x={230} y={730} s={1.7} ang={-6} lit="#8ac33a" shade="#4a8a2a" />
        <Fern x={120} y={710} s={1.4} ang={-14} t={t * 1.6} lit="#6bb23a" shade="#356f2a" />
        <Berries x={330} y={730} s={1.4} seed={8} />
        <Berries x={380} y={740} s={1.1} seed={2} />
        <Rock x={900} y={700} w={230} h={120} seed={5} lit="#615c55" shade="#34302b" />
      </L>
      <GuideStar x={880} y={130} r={17} t={t} />
      <Rain t={t} />
      <rect width={W} height={H} fill="#dfe8ff" opacity={flash} />
    </>
  );
};

/* 8 ─ aurora ridge */
export const S8: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="8" top="#08133e" bot="#2a4080" />
    <Stars n={40} seed={19} t={t} />
    <L d={0.04} cam={cam}><Aurora t={t} y={10} /></L>
    <L d={0.08} cam={cam}><Mountains base={430} seed={81} count={6} hMin={130} hMax={250} lit="#8690d2" shade="#4a549c" snow snowLit="#f4f7ff" snowShade="#b4c0ea" /></L>
    <L d={0.12} cam={cam} sh="s"><Clouds y={380} seed={82} n={5} a="#f1eef8" b="#a6add0" t={t} size={1.1} /></L>
    <L d={0.25} cam={cam}><Firs base={500} seed={83} count={26} size={0.8} lit="#1f4f46" shade="#123430" x0={-40} x1={380} /></L>
    <L d={0.4} cam={cam}><Water y={600} bottom={H + 20} deep="#1c4ab0" mid="#3f7ae8" foam="#ffffff" t={t} rows={5} amp={6} /></L>
    <L d={0.6} cam={cam}><Ledge x0={880} x1={1340} y={520} bottom={700} seed={84} cap="#b0ae32" /></L>
    <L d={0.8} cam={cam}><Ledge x0={110} x1={780} y={505} bottom={720} seed={85} cap="#b8b738" /></L>
    <Fox x={260 + p * 330} y={500} s={1.25} t={t} walk={0.65} look={-12} />
    <L d={1.2} cam={cam}>
      <Meadow t={t} x0={-20} x1={260} y={665} seed={21} n={9} />
      <Rock x={420} y={740} w={190} h={100} seed={7} />
    </L>
    <GuideStar x={860} y={150} r={19} t={t} />
  </>
);

/* 9 ─ the star gate */
export const S9: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="9" top="#0b1442" bot="#2a3a78" />
    <Stars n={44} seed={23} t={t} />
    <L d={0.03} cam={cam}><Moon x={1070} y={110} r={50} /></L>
    <L d={0.05} cam={cam} sh="s"><Clouds y={100} seed={91} n={3} a="#f3ebd2" b="#b0b0cc" t={t} /></L>
    <L d={0.1} cam={cam}><Mountains base={420} seed={92} count={6} hMin={140} hMax={240} lit="#848ed0" shade="#48529a" snow snowLit="#f4f7ff" snowShade="#b4c0ea" /></L>
    <L d={0.2} cam={cam}><Firs base={450} seed={93} count={44} size={0.65} lit="#1d4a44" shade="#12302f" /></L>
    <L d={0.25} cam={cam}>
      <Waterfall x={150} y0={290} y1={460} w={40} t={t} />
      <Waterfall x={1090} y0={310} y1={470} w={38} t={t} />
    </L>
    <L d={0.3} cam={cam}><IsoGate ox={540} oy={440} t={t} /></L>
    <L d={0.4} cam={cam}><Water y={490} bottom={H + 20} deep="#14389c" mid="#2f68e0" foam="#bcd6ff" t={t} rows={7} amp={3} /></L>
    <L d={0.4} cam={cam}><Glitter x={640} y0={500} y1={680} t={t} /></L>
    <L d={0.6} cam={cam}>
      <Rock x={560} y={590} w={90} h={36} seed={1} />
      <Rock x={700} y={620} w={110} h={40} seed={2} />
      <Rock x={820} y={660} w={130} h={48} seed={3} />
      <Rock x={1020} y={610} w={160} h={70} seed={4} />
    </L>
    <L d={0.8} cam={cam}><Ledge x0={40} x1={470} y={620} seed={95} cap="#b0ae32" /></L>
    <Fox x={250} y={616} s={1.5} t={t} look={-12} />
    <L d={1.2} cam={cam}>
      <Meadow t={t} x0={-20} x1={230} y={680} seed={31} n={7} />
      <Fern x={1180} y={730} s={1.4} ang={-12} t={t} lit="#6bb23a" shade="#356f2a" />
    </L>
    <GuideStar x={640} y={385} r={16} t={t} glow={0.5} />
    <Callouts t={t} items={[
      { label: "Stone pillar", x: 500, y: 325 },
      { label: "Star ring", x: 640, y: 385 },
      { label: "Reflecting pool", x: 700, y: 620 },
      { label: "Rune core", x: 739, y: 405, xray: true },
      { label: "Star lens", x: 655, y: 372, xray: true },
    ]} />
  </>
);

/* 10 ─ sunrise */
export const S10: React.FC<SceneProps> = ({ t, p, cam }) => (
  <>
    <Sky id="10" top="#f0b45e" bot="#fdeaa8" />
    <Sun x={950} y={420 - p * 40} r={46} t={t} color="#ffcf4a" />
    <L d={0.05} cam={cam} sh="s"><Clouds y={110} seed={101} n={5} a="#ffeab0" b="#f1b15c" t={t} size={1.2} /></L>
    <L d={0.1} cam={cam}><Mountains base={450} seed={102} count={6} hMin={110} hMax={220} lit="#a2b0ec" shade="#6f7ccc" snow snowLit="#fff7ee" snowShade="#dcd0ec" /></L>
    <L d={0.2} cam={cam}><Hills base={470} amp={34} seed={4} color="#7fb02f" hi="#a4cf4c" /></L>
    <L d={0.25} cam={cam}><Firs base={500} seed={103} count={40} size={0.7} lit="#2a6a4e" shade="#1a4a3a" /></L>
    <L d={0.35} cam={cam}><Water y={520} bottom={H + 20} deep="#3f74d8" mid="#74a6f0" foam="#ffffff" t={t} rows={6} amp={3} x0={380} /></L>
    <L d={0.35} cam={cam}><Glitter x={950} y0={530} y1={680} t={t} color="#fff0b0" /></L>
    <L d={0.5} cam={cam}><Hills base={600} amp={20} seed={9} color="#5f9a28" hi="#86bb3a" /></L>
    <L d={0.8} cam={cam}><Rock x={140} y={600} w={420} h={110} seed={8} lit="#8a7e70" shade="#554c42" moss="#b8b738" /></L>
    <Fox x={340} y={500} s={1.3} t={t} look={-10 + p * 4} />
    <L d={1.2} cam={cam}>
      <Firs base={760} seed={104} count={3} size={2.2} lit="#245f46" shade="#16402f" x0={-40} x1={200} />
      <Meadow t={t} x0={-20} x1={420} y={670} seed={41} n={11} />
      <Rock x={760} y={740} w={200} h={90} seed={6} lit="#7a6b52" shade="#4a3f30" />
    </L>
    <GuideStar x={470} y={110} r={11} t={t} glow={0.5} />
  </>
);

export const SCENES: React.FC<SceneProps>[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
