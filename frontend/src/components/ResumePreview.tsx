import React from "react";
import { ACCENT_COLORS, FONT_FAMILIES } from "@/constants/resumeThemes";
import type { ResumeData, ResumeTheme, TemplateType } from "@/types/resume";
import { ThemeCustomizer } from "./ThemeCustomizer";

interface ResumePreviewProps {
  resumeData: ResumeData;
  templateType: TemplateType;
  theme: ResumeTheme;
  userName?: string;
  onThemeChange: (updated: Partial<ResumeTheme>) => void;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  resumeData,
  templateType,
  theme,
  userName,
  onThemeChange,
}) => {
  const accent = ACCENT_COLORS[theme.accentColor];
  const font = FONT_FAMILIES[theme.fontFamily];

  const containerPadding =
    theme.density === "compact"
      ? "p-7 space-y-3.5"
      : theme.density === "spacious"
      ? "p-10 space-y-6"
      : "p-8 space-y-5";

  const experienceSpacing =
    theme.density === "compact"
      ? "space-y-3"
      : theme.density === "spacious"
      ? "space-y-6"
      : "space-y-4";

  const headerNameClass =
    templateType === "starter"
      ? "text-3xl font-bold text-gray-900 tracking-tight"
      : "text-4xl font-bold text-gray-900 tracking-tight";

  const getSectionHeaderClass = () => {
    if (theme.dividerStyle === "solid") {
      return `text-xs font-bold ${accent.text} tracking-widest mb-2.5 uppercase border-b-2 ${accent.border} pb-1`;
    }
    if (theme.dividerStyle === "shaded") {
      return `text-xs font-bold ${accent.text} ${accent.bgSoft} tracking-widest mb-2.5 uppercase px-2 py-1 rounded-sm`;
    }
    return `text-xs font-bold ${accent.text} tracking-widest mb-2.5 uppercase border-b border-gray-200 pb-1`;
  };

  const sectionHeaderClass = getSectionHeaderClass();

  return (
    <div className="xl:col-span-7 sticky top-8 flex flex-col items-center">
      {/* LIVE PERSONALIZATION TOOLBAR */}
      <ThemeCustomizer theme={theme} onChange={onThemeChange} />

      <div className="w-full max-w-[850px] mb-2 flex justify-between items-center text-xs text-muted-foreground px-1">
        <span>
          Active Template:{" "}
          <strong>
            {templateType === "starter"
              ? "1-Page Starter (Consolidated)"
              : "2-Page Experienced Professional"}
          </strong>
        </span>
        <span>
          ATS Status:{" "}
          <strong className="text-emerald-600">
            100% Vector Text • Single-Column
          </strong>
        </span>
      </div>

      {/* RESUME PAPER PREVIEW */}
      <div
        id="resume-preview"
        className={`bg-white text-black shadow-2xl border border-gray-200 w-full max-w-[850px] text-left flex flex-col ${font.className} ${containerPadding}`}
      >
        {/* HEADER */}
        <div
          className={`border-b-2 ${accent.border} pb-4 ${
            theme.headerAlign === "center" ? "text-center" : "text-left"
          }`}
        >
          <h1 className={headerNameClass}>
            {resumeData.contact.name || userName || "Your Name"}
          </h1>
          <h2
            className={`text-base font-bold ${accent.text} mt-1 uppercase tracking-widest`}
          >
            {resumeData.target_title}
          </h2>
          <p className="text-xs text-gray-600 mt-1.5 font-medium">
            {[
              resumeData.contact.location,
              resumeData.contact.email,
              resumeData.contact.links,
            ]
              .filter(Boolean)
              .join("  |  ")}
          </p>
          {resumeData.summary && (
            <p className="text-[13.5px] text-gray-700 mt-3 leading-relaxed text-left">
              {resumeData.summary}
            </p>
          )}
        </div>

        {/* STARTER TEMPLATE: Education near the top */}
        {templateType === "starter" && resumeData.education.length > 0 && (
          <div className="break-inside-avoid">
            <h3 className={sectionHeaderClass}>Education</h3>
            <div className="space-y-1.5">
              {resumeData.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-baseline text-[13.5px]"
                >
                  <span className="font-bold text-gray-900">
                    {edu.institution}
                  </span>
                  <span className="italic text-gray-700">{edu.degree}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SKILLS SECTION */}
        <div className="break-inside-avoid">
          <h3 className={sectionHeaderClass}>Technical Skills</h3>
          <div className="space-y-1.5">
            {resumeData.skills.map((skill, idx) => (
              <p key={idx} className="text-[13px] text-gray-800 leading-relaxed">
                <strong className="text-gray-900 font-bold">
                  {skill.category}:
                </strong>{" "}
                {skill.items.join(", ")}
              </p>
            ))}
          </div>
        </div>

        {/* EXPERIENCE SECTION */}
        <div>
          <h3 className={sectionHeaderClass}>Experience & Projects</h3>
          <div className={experienceSpacing}>
            {resumeData.experience.map((exp, idx) => (
              <div key={idx} className="break-inside-avoid">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="font-bold text-gray-900 text-[15px]">
                    {exp.company_name}{" "}
                    <span className="font-normal text-gray-400 mx-1">—</span>{" "}
                    <span className="font-semibold italic text-gray-700">
                      {exp.job_title}
                    </span>
                  </h4>
                  {exp.dates && (
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {exp.dates}
                    </span>
                  )}
                </div>

                {templateType === "experienced" && exp.company_description && (
                  <p className="text-[13px] italic text-gray-500 mb-2">
                    {exp.company_description}
                  </p>
                )}

                <div className="space-y-1.5 mt-2">
                  {exp.bullets.map((b) => {
                    const highlightClass =
                      b.status === "approved"
                        ? "bg-emerald-100/70 font-medium px-1 rounded"
                        : "";
                    return (
                      <div
                        key={b.id}
                        className="flex items-start text-[13px] text-gray-800 leading-relaxed pl-1"
                      >
                        <span
                          className={`mr-2.5 ${accent.text} font-bold select-none`}
                        >
                          •
                        </span>
                        <span className={highlightClass}>
                          {b.status === "approved"
                            ? b.proposed_text
                            : b.original_text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXPERIENCED TEMPLATE: Education at the bottom */}
        {templateType === "experienced" && resumeData.education.length > 0 && (
          <div className="break-inside-avoid pt-2">
            <h3 className={sectionHeaderClass}>Education</h3>
            <div className="space-y-1.5">
              {resumeData.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-baseline text-[13.5px]"
                >
                  <span className="font-bold text-gray-900">
                    {edu.institution}
                  </span>
                  <span className="italic text-gray-700">{edu.degree}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};