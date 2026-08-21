"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Stagger delay in milliseconds
  duration?: number; // Animation duration in milliseconds
  distance?: number; // Translate offset distance in px
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 650,
  distance = 36,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [positionState, setPositionState] = useState<"in-view" | "above" | "below">("below");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setPositionState("in-view");
        } else {
          setIsVisible(false);
          const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
          if (entry.boundingClientRect.top < rootTop) {
            setPositionState("above");
          } else {
            setPositionState("below");
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Compute transform offset based on positionState
  let transformValue = "translateY(0px)";
  if (!isVisible) {
    if (positionState === "above") {
      transformValue = `translateY(-${distance}px)`;
    } else {
      transformValue = `translateY(${distance}px)`;
    }
  }

  return (
    <div
      ref={ref}
      className={`scroll-reveal-item ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: transformValue,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${
          isVisible ? delay : 0
        }ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${
          isVisible ? delay : 0
        }ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
