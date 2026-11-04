import type { AccentColorId, FontFamilyId, ResumeTheme } from "@/types/resume";

export const DEFAULT_RESUME_THEME: ResumeTheme = {
  accentColor: "emerald",
  fontFamily: "sans",
  headerAlign: "left",
  dividerStyle: "subtle",
  density: "normal",
};

export const ACCENT_COLORS: Record<
  AccentColorId,
  {
    label: string;
    swatch: string;
    text: string;
    border: string;
    bgSoft: string;
  }
> = {
  emerald: {
    label: "Emerald",
    swatch: "#047857",
    text: "text-emerald-700",
    border: "border-emerald-600",
    bgSoft: "bg-emerald-50",
  },
  navy: {
    label: "Navy Blue",
    swatch: "#1d4ed8",
    text: "text-blue-800",
    border: "border-blue-700",
    bgSoft: "bg-blue-50",
  },
  charcoal: {
    label: "Executive Black",
    swatch: "#111827",
    text: "text-gray-900",
    border: "border-gray-900",
    bgSoft: "bg-gray-100",
  },
  burgundy: {
    label: "Burgundy",
    swatch: "#9f1239",
    text: "text-rose-800",
    border: "border-rose-700",
    bgSoft: "bg-rose-50",
  },
  teal: {
    label: "Ocean Teal",
    swatch: "#0f766e",
    text: "text-teal-700",
    border: "border-teal-600",
    bgSoft: "bg-teal-50",
  },
};

export const FONT_FAMILIES: Record<
  FontFamilyId,
  { label: string; className: string; printCss: string }
> = {
  sans: {
    label: "Modern Sans (Arial / Inter)",
    className: "font-sans",
    printCss: "Arial, Helvetica, sans-serif",
  },
  serif: {
    label: "Executive Serif (Georgia)",
    className: "font-serif",
    printCss: "Georgia, 'Times New Roman', serif",
  },
  mono: {
    label: "Technical Mono (Consolas)",
    className: "font-mono",
    printCss: "'Courier New', Consolas, monospace",
  },
};