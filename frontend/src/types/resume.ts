export interface Contact {
  name: string;
  email: string;
  location: string;
  links: string;
}

export interface Education {
  institution: string;
  degree: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface MissingSkill {
  id: string;
  skill_name: string;
  category: string;
  reason: string;
  status: "pending" | "added" | "dismissed";
}

export interface BulletPoint {
  id: string;
  original_text: string;
  proposed_text: string;
  reason: string;
  needs_improvement: boolean;
  status: "pending" | "approved" | "rejected" | "kept";
}

export interface Experience {
  company_name: string;
  job_title: string;
  company_description: string;
  dates: string;
  bullets: BulletPoint[];
}

export interface ResumeData {
  contact: Contact;
  education: Education[];
  target_title: string;
  summary: string;
  skills: Skill[];
  missing_skills: MissingSkill[];
  experience: Experience[];
  base_score: number;
}

export type TemplateType = "starter" | "experienced";

export type AccentColorId = "emerald" | "navy" | "charcoal" | "burgundy" | "teal";
export type FontFamilyId = "sans" | "serif" | "mono";
export type HeaderAlign = "left" | "center";
export type DividerStyle = "solid" | "subtle" | "shaded";
export type DensityLevel = "compact" | "normal" | "spacious";

export interface ResumeTheme {
  accentColor: AccentColorId;
  fontFamily: FontFamilyId;
  headerAlign: HeaderAlign;
  dividerStyle: DividerStyle;
  density: DensityLevel;
}