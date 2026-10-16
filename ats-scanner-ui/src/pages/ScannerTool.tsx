import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { account } from "../appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  UploadCloud,
  Check,
  X,
  Loader2,
  FileText,
  ArrowRight,
  Lock,
  Download,
  Sparkles,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  name: string;
  email: string;
  location: string;
  links: string;
}

interface Education {
  institution: string;
  degree: string;
}

interface Skill {
  category: string;
  items: string[];
}

interface MissingSkill {
  id: string;
  skill_name: string;
  category: string;
  reason: string;
  status: "pending" | "added" | "dismissed";
}

interface BulletPoint {
  id: string;
  original_text: string;
  proposed_text: string;
  reason: string;
  needs_improvement: boolean;
  status: "pending" | "approved" | "rejected" | "kept";
}

interface Experience {
  company_name: string;
  job_title: string;
  company_description: string;
  dates: string;
  bullets: BulletPoint[];
}

interface ResumeData {
  contact: Contact;
  education: Education[];
  target_title: string;
  summary: string;
  skills: Skill[];
  missing_skills: MissingSkill[];
  experience: Experience[];
  base_score: number;
}

type TemplateType = "starter" | "experienced";
type NullableFile = File | null;
type NullableResume = ResumeData | null;

const toSafeScore = (val: any, fallback = 72): number => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
};

export default function ScannerTool() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<NullableFile>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("starter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeData, setResumeData] = useState<NullableResume>(null);
  const [currentScore, setCurrentScore] = useState<number>(72);

  const safeBaseScore = toSafeScore(resumeData?.base_score, 72);
  const displayScore = toSafeScore(currentScore, safeBaseScore);

  // Count how many bullets actually needed rewriting vs. how many were already strong
  const totalBulletsThatNeedEdits = resumeData
    ? resumeData.experience.reduce(
        (acc, exp) =>
          acc + exp.bullets.filter((b) => b.needs_improvement !== false).length,
        0
      )
    : 0;

  const alreadyStrongBulletsCount = resumeData
    ? resumeData.experience.reduce(
        (acc, exp) =>
          acc + exp.bullets.filter((b) => b.needs_improvement === false).length,
        0
      )
    : 0;

  const totalMissingSkills = resumeData?.missing_skills
    ? resumeData.missing_skills.length
    : 0;
  const totalActionableItems = totalBulletsThatNeedEdits + totalMissingSkills;

  const pointsPerEdit =
    totalActionableItems > 0
      ? Math.max(1, Math.floor((100 - safeBaseScore) / totalActionableItems))
      : 0;

  const pendingBulletsCount = resumeData
    ? resumeData.experience.reduce(
        (acc, exp) =>
          acc + exp.bullets.filter((b) => b.status === "pending").length,
        0
      )
    : 0;

  const pendingSkillsCount = resumeData?.missing_skills
    ? resumeData.missing_skills.filter((s) => s.status === "pending").length
    : 0;

  const pendingEditsCount = pendingBulletsCount + pendingSkillsCount;
  const isScanComplete = resumeData !== null;

  useEffect(() => {
    const savedState = localStorage.getItem("resumeBuffScanState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.resumeData) {
          const base = toSafeScore(
            parsed.resumeData.base_score ?? parsed.resumeData.score,
            72
          );
          const safeResume: ResumeData = {
            ...parsed.resumeData,
            base_score: base,
            missing_skills: parsed.resumeData.missing_skills || [],
          };
          setResumeData(safeResume);
          setCurrentScore(toSafeScore(parsed.currentScore, base));
        }
        if (parsed.templateType) {
          setTemplateType(parsed.templateType);
        }
      } catch (e) {
        console.error("Failed to parse saved scan", e);
      }
    }

    const checkSession = async () => {
      try {
        const currentAccount = await account.get();
        setUser(currentAccount);
      } catch (err) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (resumeData) {
      localStorage.setItem(
        "resumeBuffScanState",
        JSON.stringify({
          resumeData,
          currentScore: displayScore,
          templateType,
        })
      );
    }
  }, [resumeData, displayScore, templateType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleJobDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  };

  const selectStarterTemplate = () => {
    setTemplateType("starter");
  };

  const selectExperiencedTemplate = () => {
    setTemplateType("experienced");
  };

  const handleScan = async () => {
    if (!file || !jobDescription) {
      setError("Please upload a PDF and paste a job description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);
      formData.append("template_type", templateType);

      const apiUrl = import.meta.env.DEV
        ? "[http://127.0.0.1:8000/api/scan](http://127.0.0.1:8000/api/scan)"
        : "[https://resumebuff-api.onrender.com/api/scan](https://resumebuff-api.onrender.com/api/scan)";

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Server error. Check Python terminal.");
      }

      const data = await response.json();
      const initialScore = toSafeScore(data.base_score ?? data.score, 72);

      const formattedData: ResumeData = {
        ...data,
        base_score: initialScore,
        missing_skills: (data.missing_skills || []).map((ms: any, idx: number) => ({
          ...ms,
          id: ms.id || `ms-${idx}`,
          status: "pending",
        })),
        experience: (data.experience || []).map((exp: any, expIdx: number) => ({
          ...exp,
          bullets: (exp.bullets || []).map((b: any, bIdx: number) => {
            const needsEdit =
              b.needs_improvement !== false &&
              b.original_text?.trim() !== b.proposed_text?.trim();
            return {
              ...b,
              id: b.id || `b-${expIdx}-${bIdx}`,
              needs_improvement: needsEdit,
              // If the bullet is already good, automatically mark it as "kept"!
              status: needsEdit ? "pending" : "kept",
            };
          }),
        })),
      };

      setResumeData(formattedData);
      setCurrentScore(initialScore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (
    expIndex: number,
    bulletId: string,
    decision: "approved" | "rejected"
  ) => {
    setResumeData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      newData.experience = [...newData.experience];
      newData.experience[expIndex] = { ...newData.experience[expIndex] };
      newData.experience[expIndex].bullets = newData.experience[
        expIndex
      ].bullets.map((b) => (b.id === bulletId ? { ...b, status: decision } : b));
      return newData;
    });

    if (decision === "approved") {
      setCurrentScore((prev) =>
        Math.min(toSafeScore(prev, safeBaseScore) + pointsPerEdit, 100)
      );
    }
  };

  const handleMissingSkillAction = (
    skillId: string,
    decision: "added" | "dismissed"
  ) => {
    setResumeData((prev) => {
      if (!prev) return prev;
      const targetSkill = prev.missing_skills.find((s) => s.id === skillId);
      if (!targetSkill) return prev;

      const updatedMissing = prev.missing_skills.map((s) =>
        s.id === skillId ? { ...s, status: decision } : s
      );

      const updatedSkills = prev.skills.map((group) => ({
        ...group,
        items: [...group.items],
      }));

      if (decision === "added") {
        const existingCatIndex = updatedSkills.findIndex(
          (g) => g.category.toLowerCase() === targetSkill.category.toLowerCase()
        );

        if (existingCatIndex >= 0) {
          const alreadyExists = updatedSkills[existingCatIndex].items.some(
            (item) => item.toLowerCase() === targetSkill.skill_name.toLowerCase()
          );
          if (!alreadyExists) {
            updatedSkills[existingCatIndex].items.push(targetSkill.skill_name);
          }
        } else {
          updatedSkills.push({
            category: targetSkill.category || "Additional Skills",
            items: [targetSkill.skill_name],
          });
        }
      }

      return {
        ...prev,
        skills: updatedSkills,
        missing_skills: updatedMissing,
      };
    });

    if (decision === "added") {
      setCurrentScore((prev) =>
        Math.min(toSafeScore(prev, safeBaseScore) + pointsPerEdit, 100)
      );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-yellow-600";
    return "text-destructive";
  };

  const handleReset = () => {
    setFile(null);
    setResumeData(null);
    setCurrentScore(72);
    setError("");
    localStorage.removeItem("resumeBuffScanState");
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("resume-preview");
    if (!element) return;

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) return;

    const cleanHtml = element.innerHTML.replace(/bg-emerald-100\/70/g, "");
    const pageMargin = templateType === "starter" ? "0.4in 0.5in" : "0.5in 0.6in";
    const docTitle =
      (resumeData?.contact.name || "Optimized").replace(/\s+/g, "_") + "_Resume";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
          <style>
            @page {
              size: letter portrait;
              margin: ${pageMargin};
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div>${cleanHtml}</div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
      </div>
    );
  }

  const isScanDisabled = loading || !file || !jobDescription;
  const starterCardStyle =
    templateType === "starter"
      ? "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-primary bg-primary/5 shadow-sm"
      : "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-border hover:border-primary/40 bg-muted/30";
  const experiencedCardStyle =
    templateType === "experienced"
      ? "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-primary bg-primary/5 shadow-sm"
      : "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-border hover:border-primary/40 bg-muted/30";

  const starterBtnVariant: "default" | "outline" =
    templateType === "starter" ? "default" : "outline";
  const experiencedBtnVariant: "default" | "outline" =
    templateType === "experienced" ? "default" : "outline";
  const scoreColorClass =
    "text-5xl font-extrabold tracking-tighter " + getScoreColor(displayScore);

  const previewContainerClass =
    templateType === "starter"
      ? "bg-white text-black shadow-2xl border border-gray-200 w-full max-w-[850px] font-sans text-left flex flex-col p-8 space-y-5"
      : "bg-white text-black shadow-2xl border border-gray-200 w-full max-w-[850px] font-sans text-left flex flex-col p-10 space-y-6";

  const headerNameClass =
    templateType === "starter"
      ? "text-3xl font-serif font-bold text-gray-900 tracking-tight"
      : "text-4xl font-serif font-bold text-gray-900 tracking-tight";

  const experienceListSpacing =
    templateType === "starter" ? "space-y-4" : "space-y-6";

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">AI Resume Builder</h1>
        <p className="text-muted-foreground text-lg">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome to ResumeBuff"}. Smart auditing that keeps what's already strong and only fixes what needs work.
        </p>
      </div>

      {!isScanComplete ? (
        <Card className="border-primary/20 shadow-md bg-card max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md font-medium">
                {error}
              </div>
            )}

            {/* STEP 1: TEMPLATE SELECTION WITH RECOMMENDATIONS */}
            <div className="space-y-4">
              <label className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary"/> 1. Choose Your Career Stage & Template
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <div onClick={selectStarterTemplate} className={starterCardStyle}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary"/> 1-Page Consolidated
                    </span>
                    <span className="text-xs font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                      Recommended for Starters
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hey, if you're a starter, student, or early-career candidate, we recommend this template. It cuts redundancy, places education near the top, and keeps everything strictly to 1 crisp page.
                  </p>
                </div>

                <div onClick={selectExperiencedTemplate} className={experiencedCardStyle}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary"/> 2-Page Comprehensive
                    </span>
                    <span className="text-xs font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                      Experienced Professionals
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hey, if you're an experienced professional, we recommend this template. It includes room for an executive summary, company context descriptions, and multi-year history across up to 2 pages.
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 2 & 3: UPLOAD AND JOB DESCRIPTION */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary"/> 2. Upload Resume (PDF)
                </label>
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer relative min-h-[160px]">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-primary mb-2"/>
                  <span className="font-medium text-center">
                    {file ? file.name : "Drag & drop or click to browse"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary"/> 3. Paste Job Description
                </label>
                <Textarea className="min-h-[160px] resize-none bg-muted/50 border-primary/30 focus-visible:ring-primary" onChange="{handleJobDescChange}" placeholder="Paste the raw text of the job posting here..." value="{jobDescription}"/>
              </div>
            </div>

            <Button className="w-full text-lg h-14 rounded-full shadow-lg" disabled="{isScanDisabled}" onClick="{handleScan}" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Auditing Bullets & Checking What Actually Needs Work...
                </>
              ) : (
                `Build ${templateType === "starter" ? "1-Page Starter" : "2-Page Experienced"} Resume`
              )}
            </Button>
          </CardContent>
        </Card>
      ) : !user ? (
        <Card className="border-primary/20 shadow-md bg-card max-w-2xl mx-auto">
          <CardContent className="p-16 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Lock className="h-10 w-10 text-primary"/>
            </div>
            <h2 className="text-3xl font-bold">Audit Complete!</h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We've audited your resume, kept your strongest bullets untouched, and upgraded the weak ones. Log in or create a free account to view your results.
            </p>
            <Button asChild className="rounded-full text-lg h-14 px-8 mt-4" size="lg">
              <Link to="/login">Log In / Sign Up to View Results</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* LEFT PANEL: Review Engine */}
          <div className="xl:col-span-5 space-y-6">
            <Card className="border-primary/20 shadow-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">ATS Match Score</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {pendingEditsCount > 0
                      ? `${pendingEditsCount} targeted suggestions to review (${alreadyStrongBulletsCount} strong bullets kept as-is).`
                      : "Audit complete! Ready for PDF export."}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <motion.div
                    key={displayScore}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={scoreColorClass}
                  >
                    {displayScore}
                  </motion.div>
                  <span className="text-xs font-semibold text-muted-foreground mt-1">
                    out of 100
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Banner when the AI finds points that are already good */}
            {alreadyStrongBulletsCount > 0 && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5"/>
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-emerald-900 dark:text-emerald-300">
                    {totalBulletsThatNeedEdits === 0
                      ? "Man, these bullet points are already great!"
                      : `${alreadyStrongBulletsCount} bullet point${alreadyStrongBulletsCount > 1 ? "s were" : " was"} already strong!`}
                  </p>
                  <p className="text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                    {totalBulletsThatNeedEdits === 0
                      ? "Your experience bullets already have strong action and impact, so we left them untouched and didn't force unnecessary AI rewrites."
                      : `We left your ${alreadyStrongBulletsCount} strongest achievement bullet${alreadyStrongBulletsCount > 1 ? "s" : ""} untouched and only suggested WDI rewrites where needed.`}
                  </p>
                </div>
              </div>
            )}

            {/* Live Template Switcher */}
            <div className="bg-muted/50 p-3 rounded-xl border flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground pl-2">
                Active Layout:
              </span>
              <div className="flex gap-2">
                <Button className="h-8 text-xs" onClick="{selectStarterTemplate}" size="sm" variant="{starterBtnVariant}">
                  1-Page Starter
                </Button>
                <Button className="h-8 text-xs" onClick="{selectExperiencedTemplate}" size="sm" variant="{experiencedBtnVariant}">
                  2-Page Experienced
                </Button>
              </div>
            </div>

            <div className="space-y-8 max-h-[700px] overflow-y-auto pr-2 pb-10">
              {/* MISSING SKILLS & EXPERIENCE GAP BOX */}
              {resumeData.missing_skills && resumeData.missing_skills.length > 0 && (
                <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 text-amber-600"/>
                      Missing Skills & Experience Gap
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The job description asks for these skills, but they aren't on your resume yet. Add them to your Technical Skills section to boost your ATS match rate:
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resumeData.missing_skills.map((ms) => {
                      const onAddSkill = () => {
                        handleMissingSkillAction(ms.id, "added");
                      };
                      const onDismissSkill = () => {
                        handleMissingSkillAction(ms.id, "dismissed");
                      };

                      return (
                        <div
                          key={ms.id}
                          className="p-3 rounded-lg bg-background border border-amber-500/20 flex flex-col gap-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-sm text-foreground">
                                {ms.skill_name}
                              </span>
                              <span className="ml-2 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {ms.category}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                              +{pointsPerEdit} Pts
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{ms.reason}</p>

                          {ms.status === "pending" ? (
                            <div className="flex justify-end gap-2 pt-1">
                              <Button className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick="{onDismissSkill}" size="sm" variant="ghost">
                                Skip
                              </Button>
                              <Button className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick="{onAddSkill}" size="sm">
                                <Plus className="mr-1 h-3 w-3"/> Add to Resume
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end pt-1">
                              <span
                                className={
                                  ms.status === "added"
                                    ? "text-xs font-bold flex items-center gap-1 text-emerald-600"
                                    : "text-xs font-bold flex items-center gap-1 text-muted-foreground"
                                }
                              >
                                {ms.status === "added" ? (
                                  <>
                                    <Check className="h-3 w-3"/> Added to {ms.category}
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3"/> Skipped
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* BULLET POINT EVALUATION & REWRITES */}
              <AnimatePresence>
                {resumeData.experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-4">
                    {exp.bullets.length > 0 && (
                      <h3 className="font-bold text-lg text-primary border-b pb-2">
                        {exp.company_name}
                      </h3>
                    )}

                    {exp.bullets.map((edit) => {
                      // Render a compact "Already Strong" card if the bullet didn't need changing
                      if (edit.status === "kept" || edit.needs_improvement === false) {
                        return (
                          <motion.div
                            key={edit.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4"/> Already Strong — Left Alone
                                  </span>
                                  <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                    Kept Original
                                  </span>
                                </div>
                                <p className="text-sm text-foreground font-medium">
                                  "{edit.original_text}"
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <strong className="text-foreground">Why: </strong>
                                  {edit.reason}
                                </p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      }

                      const editCardClass =
                        edit.status === "approved"
                          ? "border-l-4 shadow-sm transition-colors border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : edit.status === "rejected"
                          ? "border-l-4 shadow-sm transition-colors border-l-destructive bg-destructive/5 dark:bg-destructive/10"
                          : "border-l-4 shadow-sm transition-colors border-l-primary";

                      const statusBadgeClass =
                        edit.status === "approved"
                          ? "text-xs font-bold flex items-center gap-1 text-emerald-600"
                          : "text-xs font-bold flex items-center gap-1 text-destructive";

                      const onRejectClick = () => {
                        handleReview(expIdx, edit.id, "rejected");
                      };

                      const onApproveClick = () => {
                        handleReview(expIdx, edit.id, "approved");
                      };

                      return (
                        <motion.div
                          key={edit.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Card className="{editCardClass}">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                                  Wanted → Did → Impact Rewrite
                                </CardTitle>
                                <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                                  +{pointsPerEdit} Pts
                                </span>
                              </div>
                              <p className="text-sm italic text-muted-foreground mt-2 border-l-2 pl-3">
                                "{edit.original_text}"
                              </p>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <div className="flex items-start gap-3 bg-background p-3 rounded-md border border-primary/10">
                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"/>
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {edit.proposed_text}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">Why: </strong>
                                {edit.reason}
                              </p>

                              {edit.status === "pending" && (
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button className="border-destructive text-destructive hover:bg-destructive hover:text-white h-8" onClick="{onRejectClick}" size="sm" variant="outline">
                                    <X className="mr-1 h-3 w-3"/> Reject
                                  </Button>
                                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick="{onApproveClick}" size="sm">
                                    <Check className="mr-1 h-3 w-3"/> Approve
                                  </Button>
                                </div>
                              )}

                              {edit.status !== "pending" && (
                                <div className="flex justify-end pt-1">
                                  <span className={statusBadgeClass}>
                                    {edit.status === "approved" ? (
                                      <>
                                        <Check className="h-3 w-3"/> Approved
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-3 w-3"/> Rejected
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {pendingEditsCount === 0 && (
              <div className="flex justify-center pt-2">
                <Button className="w-full text-lg shadow-xl hover:scale-[1.02] transition-transform bg-primary" onClick="{handleDownloadPDF}" size="lg">
                  <Download className="mr-2 h-5 w-5"/> Export ATS-Clean PDF
                </Button>
              </div>
            )}

            <div className="flex justify-center pb-4">
              <button
                onClick={handleReset}
                className="text-sm font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
              >
                Start over with a new resume
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Spacious, High-Contrast Live Preview */}
          <div className="xl:col-span-7 sticky top-8 flex flex-col items-center">
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
                Layout: <strong className="text-emerald-600">Single-Column • Clean Hierarchy</strong>
              </span>
            </div>

            <div id="resume-preview" className={previewContainerClass}>
              {/* HEADER */}
              <div className="border-b-2 border-emerald-600 pb-4">
                <h1 className={headerNameClass}>
                  {resumeData.contact.name || user?.name || "Your Name"}
                </h1>
                <h2 className="text-base font-bold text-emerald-700 mt-1.5 uppercase tracking-widest">
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
                  <p className="text-[13.5px] text-gray-700 mt-3 leading-relaxed">
                    {resumeData.summary}
                  </p>
                )}
              </div>

              {/* STARTER TEMPLATE: Education near the top */}
              {templateType === "starter" && resumeData.education.length > 0 && (
                <div className="break-inside-avoid">
                  <h3 className="text-xs font-bold text-emerald-700 tracking-widest mb-2.5 uppercase border-b border-gray-200 pb-1">
                    Education
                  </h3>
                  <div className="space-y-1.5">
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[13.5px]">
                        <span className="font-bold text-gray-900">{edu.institution}</span>
                        <span className="italic text-gray-700">{edu.degree}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SKILLS SECTION */}
              <div className="break-inside-avoid">
                <h3 className="text-xs font-bold text-emerald-700 tracking-widest mb-2.5 uppercase border-b border-gray-200 pb-1">
                  Technical Skills
                </h3>
                <div className="space-y-1.5">
                  {resumeData.skills.map((skill, idx) => (
                    <p key={idx} className="text-[13px] text-gray-800 leading-relaxed">
                      <strong className="text-gray-900 font-bold">{skill.category}:</strong>{" "}
                      {skill.items.join(", ")}
                    </p>
                  ))}
                </div>
              </div>

              {/* EXPERIENCE SECTION */}
              <div>
                <h3 className="text-xs font-bold text-emerald-700 tracking-widest mb-3.5 uppercase border-b border-gray-200 pb-1">
                  Experience & Projects
                </h3>
                <div className={experienceListSpacing}>
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
                              <span className="mr-2.5 text-emerald-700 font-bold select-none">
                                •
                              </span>
                              <span className={highlightClass}>
                                {b.status === "approved" ? b.proposed_text : b.original_text}
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
                  <h3 className="text-xs font-bold text-emerald-700 tracking-widest mb-2.5 uppercase border-b border-gray-200 pb-1">
                    Education
                  </h3>
                  <div className="space-y-1.5">
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[13.5px]">
                        <span className="font-bold text-gray-900">{edu.institution}</span>
                        <span className="italic text-gray-700">{edu.degree}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}