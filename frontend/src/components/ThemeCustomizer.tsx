import React from "react";
import {
  ACCENT_COLORS,
  FONT_FAMILIES,
} from "@/constants/resumeThemes";
import type {
    AccentColorId,
    DensityLevel,
    DividerStyle,
    FontFamilyId,
    HeaderAlign,
    ResumeTheme,
} from "@/types/resume";
import { Palette, Type, AlignLeft, AlignCenter, Sliders } from "lucide-react";

interface ThemeCustomizerProps {
  theme: ResumeTheme;
  onChange: (updated: Partial<ResumeTheme>) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  theme,
  onChange,
}) => {
  return (
    <div className="w-full max-w-[850px] mb-4 p-3.5 rounded-xl border bg-card shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 1. ACCENT COLOR PICKER */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Palette className="h-3.5 w-3.5 text-primary" /> Color:
          </span>
          <div className="flex items-center gap-1.5">
            {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((colorKey) => {
              const item = ACCENT_COLORS[colorKey];
              const isSelected = theme.accentColor === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  title={item.label}
                  onClick={() => onChange({ accentColor: colorKey })}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    isSelected
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: item.swatch }}
                />
              );
            })}
          </div>
        </div>

        {/* 2. FONT FAMILY PICKER */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Type className="h-3.5 w-3.5 text-primary" /> Font:
          </span>
          <select
            value={theme.fontFamily}
            onChange={(e) =>
              onChange({ fontFamily: e.target.value as FontFamilyId })
            }
            className="text-xs bg-muted border border-border rounded-md px-2 py-1 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(Object.keys(FONT_FAMILIES) as FontFamilyId[]).map((fontKey) => (
              <option key={fontKey} value={fontKey}>
                {FONT_FAMILIES[fontKey].label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. HEADER ALIGNMENT */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Header:
          </span>
          <div className="flex bg-muted rounded-md p-0.5 border">
            {(["left", "center"] as HeaderAlign[]).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => onChange({ headerAlign: align })}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  theme.headerAlign === align
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {align === "left" ? (
                  <AlignLeft className="h-3 w-3" />
                ) : (
                  <AlignCenter className="h-3 w-3" />
                )}
                <span className="capitalize">{align}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECOND ROW: DIVIDER STYLE & SPACING DENSITY */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-primary" /> Section Style:
          </span>
          <div className="flex bg-muted rounded-md p-0.5 border">
            {(
              [
                { id: "subtle", label: "Subtle Line" },
                { id: "solid", label: "Bold Line" },
                { id: "shaded", label: "Shaded Band" },
              ] as { id: DividerStyle; label: string }[]
            ).map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => onChange({ dividerStyle: style.id })}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  theme.dividerStyle === style.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Spacing:
          </span>
          <div className="flex bg-muted rounded-md p-0.5 border">
            {(["compact", "normal", "spacious"] as DensityLevel[]).map(
              (density) => (
                <button
                  key={density}
                  type="button"
                  onClick={() => onChange({ density })}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium capitalize transition-colors ${
                    theme.density === density
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {density}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};