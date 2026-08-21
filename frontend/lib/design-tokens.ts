/**
 * S33 Evacuation Intelligence Platform Design System
 * 
 * WORLD A: Landing Page (Cinematic Architectural Light)
 * WORLD B: 3D Command Center (Mission-Control Operational Palette)
 */

export const LANDING_TOKENS = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F4F5",
  border: "#E4E4E7",
  borderStrong: "#D4D4D8",
  textPrimary: "#09090B",
  textSecondary: "#52525B",
  textMuted: "#A1A1AA",
  accentEmerald: "#10B981",
  accentTeal: "#0D9488",
} as const;

export const COMMAND_TOKENS = {
  bg: "#05070A",
  surface: "#081018",
  surfaceElevated: "#0D141C",
  surfaceMuted: "#111B24",
  border: "#111B24",
  borderStrong: "#1E293B",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  
  // Operational State Colors
  emerald: "#10B981",
  emeraldGlow: "rgba(16, 185, 129, 0.18)",
  amber: "#F59E0B",
  amberGlow: "rgba(245, 158, 11, 0.18)",
  red: "#EF4444",
  redGlow: "rgba(239, 68, 68, 0.22)",
  blue: "#3B82F6",
  cyan: "#06B6D4",
  cyanGlow: "rgba(6, 182, 212, 0.25)",
  violetAI: "#8B5CF6",
  violetGlow: "rgba(139, 92, 246, 0.25)",
  teal: "#14B8A6",
  tealGlow: "rgba(20, 184, 166, 0.25)",
} as const;

export const COLORS = {
  // Legacy aliases mapped to 3D Command Center palette
  background: "#05070A",
  surface: "#081018",
  surfaceElevated: "#0D141C",
  surfaceMuted: "#111B24",
  border: "#111B24",
  borderStrong: "#1E293B",
  
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  ink: "#F8FAFC",
  muted: "#94A3B8",
  
  room: "#081018",
  roomHover: "#0D141C",
  roomSelected: "#1E293B",
  wall: "#F8FAFC",
  safeZone: "#064E3B",
  safeZoneLine: "#10B981",
  
  emerald: "#10B981",
  emeraldLight: "#064E3B",
  emeraldBorder: "#047857",
  emeraldDark: "#34D399",

  amber: "#F59E0B",
  amberLight: "#451A03",
  amberBorder: "#B45309",
  amberDark: "#FBBF24",

  red: "#EF4444",
  redLight: "#450A0A",
  redBorder: "#B91C1C",
  redDark: "#F87171",

  blue: "#3B82F6",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  neutral: "#64748B",
  
  accentTeal: "#14B8A6",
  accentTealGlow: "rgba(20, 184, 166, 0.25)",
  accentRed: "#EF4444",
} as const;

export const PROFILE_COLORS = {
  normal: "#94A3B8",
  wheelchair: "#3B82F6",
  child: "#EC4899",
  elderly: "#A855F7",
  temporary_injury: "#F59E0B",
  first_responder: "#EF4444",
} as const;

export const PROFILE_ICONS = {
  normal: "🚶",
  wheelchair: "♿",
  child: "🧒",
  elderly: "🧓",
  temporary_injury: "🩼",
  first_responder: "🚨",
} as const;

export const PROFILE_LABELS = {
  normal: "Standard Occupant",
  wheelchair: "Wheelchair User",
  child: "Child",
  elderly: "Elderly Occupant",
  temporary_injury: "Mobility Impaired",
  first_responder: "First Responder Unit",
} as const;

export const WALL_STROKE_WIDTH = 4;
export const BUILDING_OUTLINE_WIDTH = 6;
export const ROUTE_DASH = "10 6";
export const ROUTE_STROKE_WIDTH = 4;