import type { Config } from "tailwindcss";

const cssVar = (name: string) =>
  ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue !== undefined
      ? `rgb(var(${name}) / ${opacityValue})`
      : `rgb(var(${name}))`;

const waColors = {
  bg: cssVar("--wa-bg"),
  panelBg: cssVar("--wa-panelBg"),
  navRail: cssVar("--wa-navRail"),
  header: cssVar("--wa-header"),
  hover: cssVar("--wa-hover"),
  active: cssVar("--wa-active"),
  border: cssVar("--wa-border"),
  bubbleOut: cssVar("--wa-bubbleOut"),
  bubbleIn: cssVar("--wa-bubbleIn"),
  accent: cssVar("--wa-accent"),
  accentBright: cssVar("--wa-accentBright"),
  textPrimary: cssVar("--wa-textPrimary"),
  textSecondary: cssVar("--wa-textSecondary"),
  textMuted: cssVar("--wa-textMuted"),
  divider: cssVar("--wa-divider"),
  panelInput: cssVar("--wa-panelInput"),
  modalBg: cssVar("--wa-modalBg"),
  danger: cssVar("--wa-danger"),
  chipActive: cssVar("--wa-chipActive"),
  chipBg: cssVar("--wa-chipBg"),
} as unknown as Record<string, string>;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wa: waColors,
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "Helvetica Neue",
          "Helvetica",
          "Lucida Grande",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        xxs: "0.6875rem",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(11,20,26,0.4)",
      },
      borderRadius: {
        bubble: "7.5px",
      },
    },
  },
  plugins: [],
};
export default config;
