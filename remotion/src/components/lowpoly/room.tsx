/**
 * Lowpoly style bundle: the default set (a calm living room behind a desk) and small flat-shaded props.
 * Same flat-shaded look as the Presenter. Add new props here, never in a project scene, so every video shares them.
 */
import React from "react";

export const WALL = "#a9ad93";
export const WALL_DARK = "#8f937c";
export const FLOOR = "#b98f5c";
export const DESK = "#8a5a37";
export const TRIM = "#e9e6dc";

type V3 = [number, number, number];

const Box: React.FC<{ p: V3; s: V3; color: string; rot?: V3; emissive?: string; intensity?: number }> = ({ p, s, color, rot = [0, 0, 0], emissive, intensity = 0 }) => (
  <mesh position={p} scale={s} rotation={rot}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={color} flatShading roughness={0.95} emissive={emissive ?? "#000000"} emissiveIntensity={intensity} />
  </mesh>
);

const Cyl: React.FC<{ p: V3; r0: number; r1: number; h: number; color: string; seg?: number; emissive?: string; intensity?: number }> = ({ p, r0, r1, h, color, seg = 6, emissive, intensity = 0 }) => (
  <mesh position={p}>
    <cylinderGeometry args={[r1, r0, h, seg, 1]} />
    <meshStandardMaterial color={color} flatShading roughness={0.95} emissive={emissive ?? "#000000"} emissiveIntensity={intensity} />
  </mesh>
);

export const Desk: React.FC = () => (
  <group>
    <Box p={[0, -0.04, 0.55]} s={[3.2, 0.08, 1.15]} color={DESK} />
    <Box p={[0, -0.5, 0.95]} s={[3.1, 0.9, 0.06]} color="#74482b" />
  </group>
);

export const Window: React.FC<{ p?: V3 }> = ({ p = [0.95, 0.95, -1.5] }) => (
  <group position={p}>
    <Box p={[0, 0, -0.01]} s={[0.9, 1.3, 0.05]} color={TRIM} />
    <Box p={[0, 0, 0.02]} s={[0.76, 1.16, 0.04]} color="#f1f4f2" emissive="#ffffff" intensity={0.55} />
    <Box p={[0, 0, 0.045]} s={[0.03, 1.16, 0.02]} color={TRIM} />
    <Box p={[0, -0.02, 0.045]} s={[0.76, 0.03, 0.02]} color={TRIM} />
  </group>
);

export const FloorLamp: React.FC<{ p?: V3 }> = ({ p = [1.75, 0, -0.9] }) => (
  <group position={p}>
    <Cyl p={[0, 0.0, 0]} r0={0.2} r1={0.2} h={0.05} color="#2c2a28" seg={8} />
    <Cyl p={[0, 0.7, 0]} r0={0.025} r1={0.025} h={1.4} color="#2c2a28" />
    <Cyl p={[0, 1.55, 0]} r0={0.2} r1={0.14} h={0.28} color="#f2e6c8" seg={8} emissive="#ffe9b0" intensity={0.5} />
    <pointLight position={[0, 1.4, 0.2]} intensity={0.35} distance={3} color="#ffe2a8" />
  </group>
);

export const Couch: React.FC<{ p?: V3 }> = ({ p = [1.35, 0.1, -1.1] }) => (
  <group position={p}>
    <Box p={[0, 0, 0]} s={[1.1, 0.4, 0.6]} color="#8e9a80" />
    <Box p={[0, 0.3, -0.22]} s={[1.1, 0.4, 0.16]} color="#85917a" />
    <Box p={[-0.52, 0.12, 0]} s={[0.12, 0.5, 0.6]} color="#7e8a72" />
    <Box p={[0.52, 0.12, 0]} s={[0.12, 0.5, 0.6]} color="#7e8a72" />
  </group>
);

export const Shelf: React.FC<{ p?: V3 }> = ({ p = [-1.2, -0.02, -1.3] }) => (
  <group position={p}>
    <Box p={[0, 0, 0]} s={[0.9, 0.34, 0.4]} color="#efece3" />
    <Box p={[0, 0.2, 0]} s={[0.46, 0.06, 0.3]} color="#1e1e1e" />
    <Box p={[-0.2, -0.17, 0.05]} s={[0.4, 0.03, 0.3]} color="#2b2b2b" />
  </group>
);

export const WallPanel: React.FC<{ p?: V3 }> = ({ p = [-1.0, 0.85, -1.5] }) => (
  <group position={p}>
    <Box p={[0, 0, 0]} s={[0.55, 0.7, 0.06]} color="#a8abab" />
    <Box p={[0, 0, 0.04]} s={[0.46, 0.6, 0.02]} color="#b9bcbc" />
    <Box p={[0.36, -0.2, 0.05]} s={[0.07, 0.16, 0.06]} color="#a8323a" />
    {[-0.17, -0.085, 0, 0.085, 0.17].map((x) => (
      <Cyl key={x} p={[x, 0.85, 0]} r0={0.008} r1={0.008} h={0.9} color="#d8d8d4" seg={4} />
    ))}
  </group>
);

/** The default set. `props` picks what to show; extend by adding another prop above. */
export const Room: React.FC<{ props?: string[]; lampLight?: boolean }> = ({ props = ["window", "lamp", "couch", "shelf", "panel"], lampLight = true }) => (
  <group>
    {/* back wall, floor, skirting */}
    <Box p={[0, 1.0, -1.58]} s={[7, 3.4, 0.1]} color={WALL} />
    <Box p={[0, -0.95, -0.2]} s={[7, 0.1, 4.2]} color={FLOOR} />
    <Box p={[0, -0.18, -1.52]} s={[7, 0.12, 0.04]} color={TRIM} />
    <Box p={[0, 2.5, 0]} s={[7, 0.2, 4]} color="#7d8068" />
    {props.includes("window") && <Window />}
    {props.includes("lamp") && <FloorLamp />}
    {props.includes("couch") && <Couch />}
    {props.includes("shelf") && <Shelf />}
    {props.includes("panel") && <WallPanel />}
    {lampLight && <pointLight position={[-1.4, 0.9, -0.6]} intensity={0.5} distance={3.5} color="#fff3d6" />}
    <Desk />
  </group>
);
