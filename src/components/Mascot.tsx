"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

export type MascotMood = "happy" | "cheer" | "thinking" | "sad" | "neutral";

/** Original mascot: "Lumo", a rounded yellow robot with a glowing visor. */
export function Mascot({ mood = "happy", size = 120, float = true, className }: { mood?: MascotMood; size?: number; float?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const body = `body-${uid}`;
  const head = `head-${uid}`;
  const visor = `visor-${uid}`;

  const eyes =
    mood === "happy" || mood === "cheer" ? (
      <g stroke="#FFE500" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M70 92 q10 -14 20 0" />
        <path d="M110 92 q10 -14 20 0" />
      </g>
    ) : mood === "sad" ? (
      <g fill="#FFE500">
        <ellipse cx="80" cy="94" rx="7" ry="9" />
        <ellipse cx="120" cy="94" rx="7" ry="9" />
        <path d="M66 80 l22 6 M134 80 l-22 6" stroke="#FFE500" strokeWidth="4" strokeLinecap="round" />
      </g>
    ) : mood === "thinking" ? (
      <g fill="#FFE500">
        <ellipse cx="80" cy="94" rx="8" ry="10" />
        <rect x="112" y="92" width="16" height="5" rx="2.5" />
      </g>
    ) : (
      <g fill="#FFE500">
        <ellipse cx="80" cy="94" rx="8" ry="10" />
        <ellipse cx="120" cy="94" rx="8" ry="10" />
      </g>
    );

  const mouth =
    mood === "sad" ? (
      <path d="M88 118 q12 -9 24 0" stroke="#FFE500" strokeWidth="4" strokeLinecap="round" fill="none" />
    ) : mood === "cheer" ? (
      <path d="M86 112 q14 18 28 0 z" fill="#FFE500" />
    ) : mood === "thinking" ? (
      <path d="M92 118 h16" stroke="#FFE500" strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M88 112 q12 11 24 0" stroke="#FFE500" strokeWidth="4" strokeLinecap="round" fill="none" />
    );

  return (
    <motion.svg
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      role="img"
      aria-label={`Lumo the robot looks ${mood}`}
      className={className}
      animate={float && !reduce ? { y: [0, -5, 0] } : undefined}
      transition={float && !reduce ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <defs>
        <radialGradient id={head} cx="35%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#FFF27A" />
          <stop offset="55%" stopColor="#FFE500" />
          <stop offset="100%" stopColor="#E3C800" />
        </radialGradient>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFEB3B" />
          <stop offset="100%" stopColor="#E0C500" />
        </linearGradient>
        <linearGradient id={visor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35352F" />
          <stop offset="100%" stopColor="#1A1A17" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="210" rx="52" ry="7" fill="#20201D" opacity="0.12" />
      {/* arms */}
      <g>
        <rect x={mood === "cheer" ? 30 : 38} y={mood === "cheer" ? 120 : 152} width="18" height="38" rx="9" fill={`url(#${body})`} stroke="#20201D" strokeOpacity="0.15" transform={mood === "cheer" ? "rotate(-35 40 140)" : undefined} />
        <rect x={mood === "cheer" ? 152 : 144} y={mood === "cheer" ? 120 : 152} width="18" height="38" rx="9" fill={`url(#${body})`} stroke="#20201D" strokeOpacity="0.15" transform={mood === "cheer" ? "rotate(35 160 140)" : undefined} />
      </g>
      {/* body */}
      <rect x="62" y="148" width="76" height="58" rx="26" fill={`url(#${body})`} stroke="#20201D" strokeOpacity="0.15" />
      <circle cx="100" cy="176" r="9" fill="#20201D" opacity="0.85" />
      <circle cx="100" cy="176" r="4" fill="#FFE500" />
      {/* antenna */}
      <rect x="97" y="22" width="6" height="24" rx="3" fill="#20201D" />
      <circle cx="100" cy="18" r="10" fill={`url(#${head})`} stroke="#20201D" strokeOpacity="0.25" />
      {/* ears */}
      <rect x="28" y="84" width="16" height="40" rx="8" fill="#20201D" />
      <rect x="156" y="84" width="16" height="40" rx="8" fill="#20201D" />
      {/* head */}
      <rect x="40" y="42" width="120" height="110" rx="46" fill={`url(#${head})`} stroke="#20201D" strokeOpacity="0.2" strokeWidth="1.5" />
      <ellipse cx="72" cy="60" rx="22" ry="9" fill="#fff" opacity="0.45" transform="rotate(-18 72 60)" />
      {/* visor */}
      <rect x="56" y="68" width="88" height="68" rx="30" fill={`url(#${visor})`} />
      {eyes}
      {mouth}
    </motion.svg>
  );
}
