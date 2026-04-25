"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Hero", href: "#hero" },
  { label: "Work", href: "#proof" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#cta" },
];

/**
 * SiteHeader — fixed overlay with the Maverich wordmark and anchor links.
 * Gains a subtle backdrop-blur + hairline border after the user scrolls past
 * 100px, so it recedes into the hero on first paint and hardens into a
 * chrome bar everywhere else.
 */
export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 100);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40"
      animate={{
        backgroundColor: scrolled ? "rgba(10, 10, 11, 0.7)" : "rgba(10, 10, 11, 0)",
        backdropFilter: scrolled ? "blur(12px)" : "blur(0px)",
        borderBottom: scrolled
          ? "1px solid var(--border-subtle)"
          : "1px solid transparent",
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <a
          href="#hero"
          className="font-medium tracking-tight"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
          }}
        >
          Maverich
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="type-mono-tag transition-colors duration-200"
              style={{ color: "var(--ink-secondary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-amber)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--ink-secondary)";
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#cta"
          className="type-mono-tag md:hidden"
          style={{ color: "var(--accent-amber)" }}
        >
          [ CONTACT ]
        </a>
      </div>
    </motion.header>
  );
}
