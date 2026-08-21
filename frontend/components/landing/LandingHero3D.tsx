"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { tacticalAudio } from "@/lib/tactical-audio";

interface LandingHeroProps {
  onOpenUpload: () => void;
}

interface OccupantProfile {
  id: string;
  name: string;
  type: string;
  mobility: string;
  speed: string;
  heartRate: number;
  status: "evacuating" | "safe" | "re-routing";
  assignedExit: string;
  eta: string;
  x: number; // percentage in 16:9 frame
  y: number;
  color: string;
}

const OCCUPANTS_DATA: OccupantProfile[] = [
  {
    id: "occ-1",
    name: "David K. (Visitor)",
    type: "Wheelchair User",
    mobility: "Step-Free Ramp Required",
    speed: "0.85 m/s",
    heartRate: 88,
    status: "evacuating",
    assignedExit: "West Portal (Accessible)",
    eta: "42s",
    x: 53.5,
    y: 49.5,
    color: "#3B82F6",
  },
  {
    id: "occ-2",
    name: "Elena R. (Staff)",
    type: "Elderly Occupant",
    mobility: "Reduced Pace (Assisted)",
    speed: "0.72 m/s",
    heartRate: 82,
    status: "evacuating",
    assignedExit: "West Portal (Accessible)",
    eta: "54s",
    x: 51.5,
    y: 44.5,
    color: "#A855F7",
  },
  {
    id: "occ-3",
    name: "Aarav S. (Security)",
    type: "Emergency Warden",
    mobility: "Standard Full Mobility",
    speed: "1.45 m/s",
    heartRate: 96,
    status: "re-routing",
    assignedExit: "East Exit Corridor",
    eta: "28s",
    x: 36.5,
    y: 51.5,
    color: "#F59E0B",
  },
  {
    id: "occ-4",
    name: "Sarah M. (Executive)",
    type: "Floor Occupant",
    mobility: "Standard Full Mobility",
    speed: "1.30 m/s",
    heartRate: 78,
    status: "evacuating",
    assignedExit: "East Exit Corridor",
    eta: "34s",
    x: 61.5,
    y: 48.5,
    color: "#10B981",
  },
  {
    id: "occ-5",
    name: "Carlos T. (Engineer)",
    type: "Floor Occupant",
    mobility: "Standard Full Mobility",
    speed: "1.25 m/s",
    heartRate: 76,
    status: "evacuating",
    assignedExit: "East Exit Corridor",
    eta: "36s",
    x: 65.5,
    y: 59.5,
    color: "#10B981",
  },
  {
    id: "occ-6",
    name: "Priya N. (Analyst)",
    type: "Floor Occupant",
    mobility: "Standard Full Mobility",
    speed: "1.35 m/s",
    heartRate: 80,
    status: "evacuating",
    assignedExit: "East Exit Corridor",
    eta: "22s",
    x: 75.5,
    y: 64.5,
    color: "#10B981",
  },
];

export default function LandingHero3D({ onOpenUpload }: LandingHeroProps) {
  const [selectedOccupant, setSelectedOccupant] = useState<OccupantProfile | null>(null);
  const [activeMode, setActiveMode] = useState<"standard" | "mobility" | "wireframe" | "safety">("standard");
  const [hazardSuppressed, setHazardSuppressed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [timeStr, setTimeStr] = useState<string>("");

  // Refs for 60fps GPU Animation and Parallax
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);

  // 1. Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Sound Toggle
  const toggleSound = () => {
    const isMuted = tacticalAudio.toggleMute();
    setSoundEnabled(!isMuted);
    if (!isMuted) tacticalAudio.playClick();
  };

  // 3. 60FPS Dynamic Digital Twin Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 1920);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 1080);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse Tracking for Parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mousePosRef.current.targetX = Math.max(-1, Math.min(1, nx));
      mousePosRef.current.targetY = Math.max(-1, Math.min(1, ny));
    };
    const handleMouseLeave = () => {
      mousePosRef.current.targetX = 0;
      mousePosRef.current.targetY = 0;
    };
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Precise Spline Paths mapped to the building's corridors
    const pathWest1 = [
      { x: 0.44, y: 0.41 },
      { x: 0.48, y: 0.43 },
      { x: 0.46, y: 0.53 },
      { x: 0.38, y: 0.55 },
      { x: 0.315, y: 0.585 },
    ];
    const pathWest2 = [
      { x: 0.535, y: 0.495 },
      { x: 0.46, y: 0.53 },
      { x: 0.38, y: 0.55 },
      { x: 0.315, y: 0.585 },
    ];
    const pathEast1 = [
      { x: 0.58, y: 0.46 },
      { x: 0.63, y: 0.51 },
      { x: 0.68, y: 0.58 },
      { x: 0.77, y: 0.64 },
      { x: 0.89, y: 0.655 },
    ];
    const pathEast2 = [
      { x: 0.655, y: 0.595 },
      { x: 0.755, y: 0.645 },
      { x: 0.89, y: 0.655 },
    ];

    interface Particle {
      path: Array<{ x: number; y: number }>;
      progress: number;
      speed: number;
      size: number;
      color: string;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const paths = [pathWest1, pathWest2, pathEast1, pathEast2];
      particles.push({
        path: paths[i % paths.length],
        progress: (i * 0.12) % 1,
        speed: 0.0035 + Math.random() * 0.003,
        size: Math.random() * 2.8 + 1.8,
        color: i % 2 === 0 ? "#10B981" : "#06B6D4",
      });
    }

    // Atmospheric Cyber Dust
    const dust: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }> = [];
    for (let i = 0; i < 35; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.25,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? "#10B981" : "#38BDF8",
      });
    }

    // Thermal Embers
    const embers: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }> = [];
    for (let i = 0; i < 22; i++) {
      embers.push({
        x: 0.785 + (Math.random() - 0.5) * 0.08,
        y: 0.435 + (Math.random() - 0.5) * 0.06,
        vx: (Math.random() - 0.5) * 0.001,
        vy: -0.001 - Math.random() * 0.002,
        life: Math.random() * 60,
        maxLife: 60 + Math.random() * 40,
        size: Math.random() * 2.5 + 1.2,
      });
    }

    const getPointOnPath = (path: Array<{ x: number; y: number }>, t: number) => {
      if (!path || path.length === 0) return { x: 0.5, y: 0.5 };
      if (path.length === 1) return { x: path[0].x, y: path[0].y };
      const clampedT = Math.max(0, Math.min(0.9999, t));
      const segs = path.length - 1;
      const segIndex = Math.max(0, Math.min(Math.floor(clampedT * segs), segs - 1));
      const segT = clampedT * segs - segIndex;
      const p0 = path[segIndex] || path[0];
      const p1 = path[segIndex + 1] || p0;
      return {
        x: p0.x + (p1.x - p0.x) * segT,
        y: p0.y + (p1.y - p0.y) * segT,
      };
    };

    let tick = 0;

    const renderLoop = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      const pos = mousePosRef.current;
      pos.x += (pos.targetX - pos.x) * 0.06;
      pos.y += (pos.targetY - pos.y) * 0.06;

      if (frameRef.current) {
        frameRef.current.style.transform = `
          perspective(1400px)
          rotateX(${pos.y * -2.8}deg)
          rotateY(${pos.x * 3.6}deg)
          translate3d(${pos.x * 6}px, ${pos.y * 5}px, 0)
        `;
      }

      // 1. Draw Atmospheric Cyber Dust
      dust.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < 0) {
          d.y = height;
          d.x = Math.random() * width;
        }
        if (d.x < 0) d.x = width;
        if (d.x > width) d.x = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = d.color;
        ctx.fill();
      });

      // 2. Draw Volumetric Thermal Hazard (East Corridor at 78.5%, 43.5%)
      const hazardX = width * 0.785;
      const hazardY = height * 0.435;

      if (!hazardSuppressed) {
        const pulse1 = (Math.sin(tick * 0.04) + 1) * 0.5;
        const pulse2 = (Math.sin(tick * 0.04 + Math.PI / 2) + 1) * 0.5;

        // Thermal Core Glow
        const radGrad = ctx.createRadialGradient(hazardX, hazardY, 0, hazardX, hazardY, width * 0.12);
        radGrad.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        radGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.15)");
        radGrad.addColorStop(1, "rgba(239, 68, 68, 0)");

        ctx.beginPath();
        ctx.arc(hazardX, hazardY, width * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = radGrad;
        ctx.globalAlpha = 0.9;
        ctx.fill();

        // Expanding Shockwave Energy Rings
        [pulse1, pulse2].forEach((pVal) => {
          const ringR = width * (0.04 + pVal * 0.07);
          ctx.beginPath();
          ctx.ellipse(hazardX, hazardY, ringR, ringR * 0.65, -0.15, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 * (1 - pVal)})`;
          ctx.lineWidth = 2.4;
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#EF4444";
          ctx.stroke();
        });

        // Rising Fire Embers
        embers.forEach((e) => {
          e.life++;
          e.x += e.vx;
          e.y += e.vy;
          if (e.life > e.maxLife) {
            e.life = 0;
            e.x = 0.785 + (Math.random() - 0.5) * 0.08;
            e.y = 0.435 + (Math.random() - 0.5) * 0.06;
          }
          const alpha = Math.sin((e.life / e.maxLife) * Math.PI);
          const ex = e.x * width;
          const ey = e.y * height;

          ctx.beginPath();
          ctx.arc(ex, ey, e.size, 0, Math.PI * 2);
          ctx.fillStyle = "#FFB020";
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#FF4400";
          ctx.fill();
        });
      } else {
        // Suppression Active Green Shield Ring
        ctx.beginPath();
        ctx.ellipse(hazardX, hazardY, width * 0.07, width * 0.045, -0.15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#10B981";
        ctx.stroke();
      }

      // 3. Draw Flowing Egress Route Lasers
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1) p.progress = 0;

        const pt = getPointOnPath(p.path, p.progress);
        const px = pt.x * width;
        const py = pt.y * height;

        // Particle Head Glow
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = activeMode === "mobility" ? "#38BDF8" : p.color;
        ctx.globalAlpha = 0.95;
        ctx.shadowBlur = 14;
        ctx.shadowColor = activeMode === "mobility" ? "#38BDF8" : p.color;
        ctx.fill();

        // High-Speed Laser Trailing Stream
        if (p.progress > 0.02) {
          const trail = getPointOnPath(p.path, p.progress - 0.025);
          ctx.beginPath();
          ctx.moveTo(trail.x * width, trail.y * height);
          ctx.lineTo(px, py);
          ctx.strokeStyle = activeMode === "mobility" ? "#38BDF8" : p.color;
          ctx.lineWidth = p.size * 0.85;
          ctx.globalAlpha = 0.55;
          ctx.stroke();
        }
      });

      // 4. Emergency Exit Portal Safe Beacons
      const exitGlow = (Math.sin(tick * 0.06) + 1) * 0.5;
      [
        { x: width * 0.315, y: height * 0.585 },
        { x: width * 0.89, y: height * 0.655 },
      ].forEach((exit) => {
        ctx.beginPath();
        ctx.arc(exit.x, exit.y, width * 0.025 + exitGlow * 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + exitGlow * 0.25})`;
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#10B981";
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeMode, hazardSuppressed]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden bg-[#05070A] flex items-center justify-center select-none"
    >
      {/* ─────────────────────────────────────────────────────────────
          AMBIENT EXPANSIVE BACKDROP (Glows behind the 16:9 canvas)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-30 blur-3xl scale-110"
        style={{ backgroundImage: `url('/hero-digital-twin.jpg')` }}
      />

      {/* ─────────────────────────────────────────────────────────────
          TOP SOUND & LIVE BROADCAST TACTICAL BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-6 right-6 z-40 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[#081018]/90 px-3.5 py-1 backdrop-blur-xl shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
              SIH DIGITAL TWIN CORE • ONLINE
            </span>
          </div>

          {activeMode !== "standard" && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/70 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300 uppercase">
              <span>ACTIVE MODE: {activeMode}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#081018]/80 px-3 py-1 font-mono text-[10px] font-semibold text-slate-300 hover:border-emerald-400 hover:text-white transition"
          >
            <span>{soundEnabled ? "🔊 AUDIO ON" : "🔇 MUTED"}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CENTRAL 16:9 CINEMATIC DIGITAL-TWIN FRAME
          ───────────────────────────────────────────────────────────── */}
      <div
        ref={frameRef}
        className="relative w-full max-w-[1920px] aspect-[16/9] max-h-screen rounded-2xl overflow-hidden shadow-2xl shadow-black border border-white/[0.08] will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* 1. MASTER S33 ARTWORK BACKDROP */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/hero-digital-twin.jpg')` }}
        />

        {/* 2. DIGITAL TWIN LASER RADAR SCAN LINE */}
        <div className="pointer-events-none absolute inset-0 z-12 overflow-hidden">
          <div className="digital-twin-radar-scan" />
        </div>

        {/* 3. 60FPS REAL-TIME GPU EFFECTS CANVAS */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-15" />

        {/* ─────────────────────────────────────────────────────────────
            4. INTERACTIVE OCCUPANT BEACONS (Click for Live Telemetry)
            ───────────────────────────────────────────────────────────── */}
        {OCCUPANTS_DATA.map((occ) => (
          <button
            key={occ.id}
            type="button"
            onClick={() => {
              tacticalAudio.playClick();
              setSelectedOccupant(occ);
            }}
            onMouseEnter={() => tacticalAudio.playHover()}
            className="absolute z-25 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 cursor-pointer group transition-transform hover:scale-125 focus:outline-none"
            style={{ top: `${occ.y}%`, left: `${occ.x}%` }}
            title={`Inspect ${occ.name}`}
          >
            <span
              className="block h-4 w-4 rounded-full border-2 border-white shadow-[0_0_15px_currentColor] animate-pulse"
              style={{
                backgroundColor: occ.color,
                color: occ.color,
              }}
            />
          </button>
        ))}

        {/* OCCUPANT BIOMETRICS TELEMETRY CARD */}
        {selectedOccupant && (
          <div
            className="absolute z-35 -translate-x-1/2 rounded-2xl border border-cyan-500/40 bg-[#081018]/95 p-4 shadow-2xl backdrop-blur-2xl text-slate-100 max-w-xs animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: `${Math.max(15, selectedOccupant.y - 18)}%`,
              left: `${selectedOccupant.x}%`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selectedOccupant.color }}
                />
                <span className="font-mono text-xs font-bold text-white">
                  {selectedOccupant.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOccupant(null)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Profile:</span>
                <span className="text-cyan-300 font-bold">{selectedOccupant.type}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mobility Requirement:</span>
                <span className="text-slate-200">{selectedOccupant.mobility}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Assigned Safe Egress:</span>
                <span className="text-emerald-400 font-bold">{selectedOccupant.assignedExit}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Calculated ETA:</span>
                <span className="text-emerald-300 font-bold">{selectedOccupant.eta}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Live Heart Rate:</span>
                <span className="text-red-400 font-bold">{selectedOccupant.heartRate} bpm</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800">
              <Link
                href="/dashboard"
                onClick={() => tacticalAudio.playClick()}
                className="w-full text-center rounded-lg bg-emerald-500 py-1.5 font-mono text-[10px] font-black uppercase text-slate-950 hover:bg-emerald-400"
              >
                Track in Mission Control →
              </Link>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. HAZARD SIMULATION INTERACTIVE ZONE (Click to suppress/ignite)
            ───────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playAlert();
            setHazardSuppressed(!hazardSuppressed);
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-25 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-red-400/80"
          style={{
            top: "33.5%",
            right: "12%",
            width: "23%",
            height: "36%",
            transform: "rotate(-10deg)",
          }}
          title={hazardSuppressed ? "Click to Ignite Thermal Fire Hazard" : "Click to Trigger Smart Fire Suppression"}
        >
          <span className="sr-only">Toggle Hazard Suppression</span>
        </button>

        {/* ─────────────────────────────────────────────────────────────
            6. PIXEL-PERFECT INTERACTIVE HITBOXES FOR BUTTONS & PANELS
            ───────────────────────────────────────────────────────────── */}
        {/* Top-Right Launch Command Center */}
        <Link
          href="/dashboard"
          onClick={() => tacticalAudio.playClick()}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-xl transition-all hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] hover:ring-2 hover:ring-emerald-400 hover:bg-emerald-500/10"
          style={{
            top: "2.2%",
            right: "3.5%",
            width: "16.8%",
            height: "5.5%",
          }}
          title="Launch Command Center"
        >
          <span className="sr-only">Launch Command Center</span>
        </Link>

        {/* Hero Left Primary CTA: Launch Command Center */}
        <Link
          href="/dashboard"
          onClick={() => tacticalAudio.playClick()}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-xl transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.8)] hover:ring-2 hover:ring-emerald-400 hover:bg-emerald-500/15"
          style={{
            top: "67.5%",
            left: "3.1%",
            width: "14.5%",
            height: "6.2%",
          }}
          title="Launch Command Center"
        >
          <span className="sr-only">Launch Command Center</span>
        </Link>

        {/* Hero Left Secondary CTA: Watch Demo */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playClick();
            setShowDemoModal(true);
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:ring-2 hover:ring-emerald-400/80 hover:bg-emerald-500/15"
          style={{
            top: "67.5%",
            left: "18.5%",
            width: "9.8%",
            height: "6.2%",
          }}
          title="Watch Demo"
        >
          <span className="sr-only">Watch Demo</span>
        </button>

        {/* Floating Panel 1: OCCUPANTS */}
        <div
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)]"
          style={{
            top: "13.2%",
            left: "30.4%",
            width: "12.8%",
            height: "10.2%",
          }}
          title="Occupant Registry Telemetry"
        >
          <span className="sr-only">Occupants HUD</span>
        </div>

        {/* Floating Panel 2: HAZARD STATUS */}
        <div
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-red-400 hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]"
          style={{
            top: "11.2%",
            left: "46.2%",
            width: "14.2%",
            height: "10.8%",
          }}
          title="Hazard Status Telemetry"
        >
          <span className="sr-only">Hazard Status HUD</span>
        </div>

        {/* Floating Panel 3: ROUTE CONFIDENCE */}
        <div
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-teal-400 hover:shadow-[0_0_35px_rgba(20,184,166,0.4)]"
          style={{
            top: "16.8%",
            right: "17.8%",
            width: "11.8%",
            height: "11.8%",
          }}
          title="Route Confidence Telemetry"
        >
          <span className="sr-only">Route Confidence HUD</span>
        </div>

        {/* Bottom Feature Button 1: DIGITAL TWIN VISUALIZATION */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playClick();
            setActiveMode(activeMode === "wireframe" ? "standard" : "wireframe");
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-emerald-400/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          style={{
            top: "81.8%",
            left: "3.4%",
            width: "6.8%",
            height: "11.2%",
          }}
          title="Toggle Digital Twin Spatial Grid"
        >
          <span className="sr-only">Digital Twin Visualization</span>
        </button>

        {/* Bottom Feature Button 2: REAL-TIME ROUTING */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playClick();
            onOpenUpload();
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-emerald-400/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          style={{
            top: "81.8%",
            left: "10.9%",
            width: "6.8%",
            height: "11.2%",
          }}
          title="Upload Floor Plan & Calculate Routes"
        >
          <span className="sr-only">Real-Time Routing</span>
        </button>

        {/* Bottom Feature Button 3: MOBILITY AWARENESS */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playClick();
            setActiveMode(activeMode === "mobility" ? "standard" : "mobility");
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          style={{
            top: "81.8%",
            left: "18.4%",
            width: "6.8%",
            height: "11.2%",
          }}
          title="Toggle Mobility Accessibility Overlay"
        >
          <span className="sr-only">Mobility Awareness</span>
        </button>

        {/* Bottom Feature Button 4: SAFER OCCUPANTS */}
        <button
          type="button"
          onClick={() => {
            tacticalAudio.playClick();
            setActiveMode(activeMode === "safety" ? "standard" : "safety");
          }}
          onMouseEnter={() => tacticalAudio.playHover()}
          className="absolute z-30 cursor-pointer rounded-2xl transition-all hover:ring-2 hover:ring-emerald-400/80 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          style={{
            top: "81.8%",
            left: "25.9%",
            width: "6.8%",
            height: "11.2%",
          }}
          title="Toggle Occupant Safety Triage"
        >
          <span className="sr-only">Safer Occupants</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE DEMO BRIEFING MODAL
          ───────────────────────────────────────────────────────────── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
          <div className="relative w-full max-w-2xl rounded-3xl border border-emerald-500/40 bg-[#081018] p-8 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SIH S33 Autonomous Egress Simulation</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playClick();
                  setShowDemoModal(false);
                }}
                className="text-slate-400 hover:text-white text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            <h3 className="mt-4 text-2xl font-black text-white">
              Autonomous Digital Twin Pathfinding
            </h3>

            <p className="mt-2 text-sm text-slate-300 leading-relaxed font-normal">
              S33 dynamically converts CAD floor plans into high-density topological routing graphs. When thermal hazards ignite, it recalibrates safe egress vectors across accessible corridors and delivers sub-second navigation guidance to facility operations personnel.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 font-mono text-xs text-center">
              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4">
                <div className="text-emerald-400 text-xl font-black">12ms</div>
                <div className="mt-1 text-slate-400">Path Compute Latency</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4">
                <div className="text-teal-300 text-xl font-black">100%</div>
                <div className="mt-1 text-slate-400">Step-Free Accessibility</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4">
                <div className="text-cyan-400 text-xl font-black">3D MESH</div>
                <div className="mt-1 text-slate-400">Spatial Vector Model</div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  tacticalAudio.playClick();
                  setShowDemoModal(false);
                }}
                className="rounded-xl border border-slate-800 px-5 py-2.5 font-mono text-xs text-slate-300 hover:text-white"
              >
                Close Demo
              </button>
              <Link
                href="/dashboard"
                onClick={() => tacticalAudio.playClick()}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-emerald-400 shadow-xl"
              >
                Launch Command Center →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
