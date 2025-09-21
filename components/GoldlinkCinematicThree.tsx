"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------------- utilities ----------------------------- */

function makeRadialSprite(size = 256, color = "#FBBF24") {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const grd = ctx.createRadialGradient(r, r, 0, r, r, r);
  const col = new THREE.Color(color);
  const c1 = `rgba(${Math.round(col.r * 255)},${Math.round(
    col.g * 255
  )},${Math.round(col.b * 255)},1)`;
  grd.addColorStop(0, c1);
  grd.addColorStop(0.25, `rgba(251,191,36,0.75)`);
  grd.addColorStop(0.5, `rgba(251,191,36,0.25)`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* --------------------------- Arc (thin, tapered) --------------------------- */

type ArcProps = {
  radius: number;
  tube: number;
  start: number;
  end: number;
  speed: number; // rotation speed
  delay: number; // when it starts revealing
  color?: string;
  wobble?: number;
};

function Arc({
  radius,
  tube,
  start,
  end,
  speed,
  delay,
  color = "#FBBF24",
  wobble = 0.015,
}: ArcProps) {
  const m = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  // We’ll build a custom, tapered tube along a short curve segment
  const meshRef = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => {
    // polyline for the torus-like segment
    const arc = new THREE.Curve<THREE.Vector3>();
    (arc as any).getPoint = (t: number) => {
      const a = THREE.MathUtils.lerp(start, end, t);
      const r = radius * (1 + Math.sin(a * 3.0) * wobble); // light jitter
      return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
    };

    const tubularSegments = 80;
    const radialSegments = 16;

    // Variable radius along the arc (tapered ends)
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= tubularSegments; i++) {
      pathPoints.push(arc.getPoint(i / tubularSegments));
    }
    const path = new THREE.CatmullRomCurve3(pathPoints);

    const g = new THREE.TubeGeometry(
      path,
      tubularSegments,
      tube, // base
      radialSegments,
      false
    );

    // Taper the tube with a vertex modifier (scale by v along length)
    const aLen = g.attributes.position.count;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const center = new THREE.Vector3();

    // compute tapered radius by v (uv.y is along the tube)
    for (let i = 0; i < aLen; i++) {
      const v = uv.getY(i); // 0..1 along the tube
      const t = Math.min(v, 1 - v) * 2; // 1 in middle -> 0 at ends
      const scale = THREE.MathUtils.lerp(0.25, 1, t * t); // sharper taper
      pos.setXYZ(
        i,
        pos.getX(i) * scale,
        pos.getY(i) * scale,
        pos.getZ(i) * scale
      );
    }
    g.computeVertexNormals();
    return g;
  }, [radius, tube, start, end, wobble]);

  // little head “spark” sprite
  const spriteTex = useMemo(() => makeRadialSprite(256, color), [color]);
  const headRef = useRef<THREE.Sprite>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const prog = Math.max(0, t - delay);
    const vis = easeOutExpo(Math.min(prog, 1));
    m.opacity = vis * 0.9;
    const rot = t * speed;
    meshRef.current.rotation.z = rot;

    // move spark to arc end
    const a = end + rot;
    const r = radius;
    headRef.current.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.01);
    (headRef.current.material as THREE.SpriteMaterial).opacity = vis;
    headRef.current.scale.setScalar(0.25 + 0.15 * Math.sin(t * 12));
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geo} material={m} />
      <sprite
        ref={headRef}
        material={new THREE.SpriteMaterial({
          map: spriteTex,
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })}
      />
    </group>
  );
}

/* ------------------------------ ember dust ------------------------------ */

function Particles({ delay = 0.2, count = 400 }: { delay?: number; count?: number }) {
  const ref = useRef<THREE.Points>(null!);

  const { positions, velocities, life } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // small disk near center
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.2 + 0.05;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

      // outward velocity
      const speed = 0.4 + Math.random() * 0.6;
      velocities[i * 3 + 0] = Math.cos(a) * speed;
      velocities[i * 3 + 1] = Math.sin(a) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      life[i] = Math.random() * 1.2 + 0.8;
    }
    return { positions, velocities, life };
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
    return g;
  }, [positions, life]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#FBBF24"),
        size: 0.03,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

 useFrame((state) => {
  const t = state.clock.getElapsedTime();
  const dt = state.clock.getDelta();
  const start = Math.max(0, t - delay);

  const pos = geom.getAttribute("position") as THREE.BufferAttribute;
  const lif = geom.getAttribute("aLife") as THREE.BufferAttribute;

  // opacity rises then falls
  mat.opacity = THREE.MathUtils.clamp(start * 1.2, 0, 1) * 0.85;

  for (let i = 0; i < count; i++) {
    // decrement lifetime properly
    const newLife = lif.getX(i) - dt * 0.5;
    lif.setX(i, newLife);

    if (newLife <= 0) {
      // respawn near center
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.2 + 0.05;
      pos.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.05);
      lif.setX(i, Math.random() * 1.2 + 0.8);

      const s = 0.4 + Math.random() * 0.6;
      velocities[i * 3 + 0] = Math.cos(a) * s;
      velocities[i * 3 + 1] = Math.sin(a) * s;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    } else {
      const x = pos.getX(i) + velocities[i * 3 + 0] * dt * 0.35;
      const y = pos.getY(i) + velocities[i * 3 + 1] * dt * 0.35;
      const z = pos.getZ(i) + velocities[i * 3 + 2] * dt * 0.35;
      pos.setXYZ(i, x, y, z);
    }
  }

  pos.needsUpdate = true;
  lif.needsUpdate = true;
});


  return <points ref={ref} geometry={geom} material={mat} />;
}

/* ------------------------------ bloom blobs ------------------------------ */

function BloomBlob({ scale = 1, delay = 0 }: { scale?: number; delay?: number }) {
  const tex = useMemo(() => makeRadialSprite(512), []);
  const sRef = useRef<THREE.Sprite>(null!);
  useFrame((state) => {
    const t = Math.max(0, state.clock.getElapsedTime() - delay);
    const k = easeInOutCubic(Math.min(t / 1.2, 1));
    if (sRef.current) {
      sRef.current.scale.setScalar(2.2 * scale * (0.8 + 0.25 * Math.sin(t * 2)));
      (sRef.current.material as THREE.SpriteMaterial).opacity = k * 0.8;
    }
  });
  return (
    <sprite
      ref={sRef}
      position={[0, 0, 0]}
      material={new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#FBBF24"),
      })}
    />
  );
}

/* ------------------------------- main scene ------------------------------- */

function RingsAndFX() {
  // arc timings and radii (thin, uneven)
  const arcs = [
    { r: 1.05, tube: 0.02, start: -Math.PI * 0.45, end: Math.PI * 0.15, speed: 0.65, delay: 0.0 },
    { r: 0.78, tube: 0.018, start: -Math.PI * 0.35, end: Math.PI * 0.9, speed: 0.72, delay: 0.15 },
    { r: 0.53, tube: 0.015, start: -Math.PI * 0.1, end: Math.PI * 0.65, speed: 0.8, delay: 0.28 },
  ];

  const group = useRef<THREE.Group>(null!);

  useFrame((s) => {
    // subtle camera drift / group drift
    const t = s.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.z = Math.sin(t * 0.25) * 0.1;
      group.current.position.y = Math.sin(t * 0.7) * 0.03;
    }
  });

  return (
    <group ref={group}>
      {/* faint background glow first */}
      <BloomBlob scale={1.25} delay={0.1} />
      <BloomBlob scale={0.9} delay={0.3} />

      {arcs.map((a, i) => (
        <Arc
          key={i}
          radius={a.r}
          tube={a.tube}
          start={a.start}
          end={a.end}
          speed={a.speed}
          delay={a.delay}
          wobble={0.012 + i * 0.006}
        />
      ))}

      <Particles delay={0.25} count={500} />
    </group>
  );
}

/* ---------------------------- text reveal overlay ---------------------------- */

function GoldlinkText({ show }: { show: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const k = easeOutExpo(THREE.MathUtils.clamp((t - 1.1) / 0.8, 0, 1));
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = (show ? 1 : 0) * k;
      (ref.current.material as THREE.MeshBasicMaterial).color.set("#FBBF24");
    }
  });
  return (
    <Text
      ref={ref as any}
      position={[0, 0, 0.02]}
      fontSize={0.35}
      anchorX="center"
      anchorY="middle"
      font="/fonts/Orbitron-Regular.ttf" // optional; remove if you don’t have it
      material-transparent
      material-opacity={0}
      material-depthWrite={false}
      material-blending={THREE.AdditiveBlending}
    >
      GOLDLINK
    </Text>
  );
}

/* --------------------------------- Canvas --------------------------------- */

export default function GoldlinkCinematicThree() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1700); // let arcs & particles start then reveal
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        background: "transparent",
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 540 }} // zoom controls scene scale
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0); // transparent so it sits on top of your page
        }}
      >
        {/* black “space” — comment out if you want see-through */}
        <color attach="background" args={["#000"]} />
        <RingsAndFX />
        <GoldlinkText show={ready} />
      </Canvas>
    </div>
  );
}
