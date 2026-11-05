import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { account } from "../appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import type { ResumeData, ResumeTheme, TemplateType } from "@/types/resume";
import { DEFAULT_RESUME_THEME } from "@/constants/resumeThemes";
import { exportResumeToPDF } from "@/utils/pdfExport";
import { ResumeUploader } from "@/components/ResumeUploader";
import { FeedbackResults } from "@/components/FeedbackResults";
import { ResumePreview } from "@/components/ResumePreview";

const toSafeScore = (val: any, fallback = 72): number => {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
};

export default function ScannerTool() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("starter");
  const [theme, setTheme] = useState<ResumeTheme>(DEFAULT_RESUME_THEME);
  const [loading, setLoading] = useState(false);
  // True for a brief moment after the backend responds so the progress bar can hit 100%
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [currentScore, setCurrentScore] = useState<number>(72);

  const safeBaseScore = toSafeScore(resumeData?.base_score, 72);
  const displayScore = toSafeScore(currentScore, safeBaseScore);

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

  const totalMissingSkills = resumeData?.missing_skills?.length || 0;
  const totalActionableItems = totalBulletsThatNeedEdits + totalMissingSkills;

  // Math.ceil (not floor) so approving every suggestion actually reaches the top
  // score. The handlers below cap the total at 100.
  const pointsPerEdit =
    totalActionableItems > 0
      ? Math.max(1, Math.ceil((100 - safeBaseScore) / totalActionableItems))
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

  useEffect(() => {
    // Clear anything left over from the old localStorage approach
    localStorage.removeItem("resumeBuffScanState");

    const pending = sessionStorage.getItem("resumeBuffPendingScan");

    account
      .get()
      .then((currentAccount) => {
        setUser(currentAccount);

        // Only restore the handoff for a logged-in user
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            const base = toSafeScore(parsed.resumeData?.base_score, 72);
            setResumeData({
              ...parsed.resumeData,
              base_score: base,
              missing_skills: parsed.resumeData.missing_skills || [],
            });
            setCurrentScore(toSafeScore(parsed.currentScore, base));
            if (parsed.templateType) setTemplateType(parsed.templateType);
            if (parsed.theme) setTheme({ ...DEFAULT_RESUME_THEME, ...parsed.theme });
          } catch (e) {
            console.error("Failed to restore pending scan", e);
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => {
        sessionStorage.removeItem("resumeBuffPendingScan"); // always consume
        setAuthLoading(false);
      });
  }, []);

  const handleThemeChange = (updated: Partial<ResumeTheme>) => {
    setTheme((prev) => ({ ...prev, ...updated }));
  };

  const handleScan = async () => {
    if (!file || !jobDescription) {
      setError("Please upload a PDF and paste a job description.");
      return;
    }

    setLoading(true);
    setFinishing(false);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);
      formData.append("template_type", templateType);

      const apiUrl = import.meta.env.DEV
        ? "http://127.0.0.1:8000/api/scan"
        : "https://resumebuff-api.onrender.com/api/scan";

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
              status: needsEdit ? "pending" : "kept",
            };
          }),
        })),
      };

      // Let the progress bar finish (100% + checkmark) before showing results
      setFinishing(true);
      await new Promise((resolve) => setTimeout(resolve, 700));

      setResumeData(formattedData);
      setCurrentScore(initialScore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFinishing(false);
    }
  };

  const handleReviewBullet = (
    expIndex: number,
    bulletId: string,
    decision: "approved" | "rejected"
  ) => {
    setResumeData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev, experience: [...prev.experience] };
      newData.experience[expIndex] = {
        ...newData.experience[expIndex],
        bullets: newData.experience[expIndex].bullets.map((b) =>
          b.id === bulletId ? { ...b, status: decision } : b
        ),
      };
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

      return { ...prev, skills: updatedSkills, missing_skills: updatedMissing };
    });

    if (decision === "added") {
      setCurrentScore((prev) =>
        Math.min(toSafeScore(prev, safeBaseScore) + pointsPerEdit, 100)
      );
    }
  };

  const handleReset = () => {
    setFile(null);
    setResumeData(null);
    setCurrentScore(72);
    setError("");
    localStorage.removeItem("resumeBuffScanState");
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          AI Resume Builder
        </h1>
        <p className="text-muted-foreground text-lg">
          {user
            ? `Welcome back, ${user.name.split(" ")[0]}`
            : "Welcome to ResumeBuff"}
          . Smart auditing that keeps what's already strong and only fixes what
          needs work.
        </p>
      </div>

      {!resumeData ? (
        <ResumeUploader
          file={file}
          jobDescription={jobDescription}
          templateType={templateType}
          loading={loading}
          finishing={finishing}
          error={error}
          onFileUpload={(e) =>
            e.target.files?.[0] && setFile(e.target.files[0])
          }
          onJobDescChange={(e) => setJobDescription(e.target.value)}
          onTemplateChange={setTemplateType}
          onScan={handleScan}
        />
      ) : !user ? (
        <Card className="border-primary/20 shadow-md bg-card max-w-2xl mx-auto">
          <CardContent className="p-16 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Audit Complete!</h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We've audited your resume, kept your strongest bullets untouched,
              and upgraded the weak ones. Log in or create a free account to
              view your results.
            </p>
            <Button
              asChild
              className="rounded-full text-lg h-14 px-8 mt-4"
              size="lg"
            >
              <Link
                to="/login"
                onClick={() =>
                  sessionStorage.setItem(
                    "resumeBuffPendingScan",
                    JSON.stringify({
                      resumeData,
                      currentScore: displayScore,
                      templateType,
                      theme,
                    })
                  )
                }
              >
                Log In / Sign Up to View Results
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <FeedbackResults
            resumeData={resumeData}
            displayScore={displayScore}
            pointsPerEdit={pointsPerEdit}
            pendingEditsCount={pendingEditsCount}
            alreadyStrongBulletsCount={alreadyStrongBulletsCount}
            totalBulletsThatNeedEdits={totalBulletsThatNeedEdits}
            templateType={templateType}
            onTemplateChange={setTemplateType}
            onReviewBullet={handleReviewBullet}
            onMissingSkillAction={handleMissingSkillAction}
            onDownloadPDF={() =>
              exportResumeToPDF(
                resumeData.contact.name || user?.name,
                templateType,
                theme
              )
            }
            onReset={handleReset}
          />

          <ResumePreview
            resumeData={resumeData}
            templateType={templateType}
            theme={theme}
            userName={user?.name}
            onThemeChange={handleThemeChange}
          />
        </div>
      )}
    </div>
  );
}
