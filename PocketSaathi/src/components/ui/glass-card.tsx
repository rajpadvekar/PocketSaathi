"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  hoverEffect = true,
  onClick,
  delay = 0,
}) => {
  const hoverVariants: Variants = hoverEffect
    ? {
        hover: {
          y: -4,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
          borderColor: "rgba(255, 255, 255, 0.45)",
          scale: 1.01,
        },
      }
    : {};


  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={hoverEffect ? "hover" : undefined}
      variants={hoverVariants}
      onClick={onClick}
      className={`glass-panel rounded-2xl p-6 transition-all duration-300 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
