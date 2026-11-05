import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  X,
  ArrowRight,
  Download,
  AlertTriangle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResumeData, TemplateType } from "@/types/resume";

interface FeedbackResultsProps {
  resumeData: ResumeData;
  displayScore: number;
  pointsPerEdit: number;
  pendingEditsCount: number;
  alreadyStrongBulletsCount: number;
  totalBulletsThatNeedEdits: number;
  templateType: TemplateType;
  onTemplateChange: (type: TemplateType) => void;
  onReviewBullet: (
    expIndex: number,
    bulletId: string,
    decision: "approved" | "rejected"
  ) => void;
  onMissingSkillAction: (
    skillId: string,
    decision: "added" | "dismissed"
  ) => void;
  onDownloadPDF: () => void;
  onReset: () => void;
}

export const FeedbackResults: React.FC<FeedbackResultsProps> = ({
  resumeData,
  displayScore,
  pointsPerEdit,
  pendingEditsCount,
  alreadyStrongBulletsCount,
  totalBulletsThatNeedEdits,
  templateType,
  onTemplateChange,
  onReviewBullet,
  onMissingSkillAction,
  onDownloadPDF,
  onReset,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-yellow-600";
    return "text-destructive";
  };

  const missingSkills = resumeData.missing_skills ?? [];
  const pendingSkillsCount = missingSkills.filter(
    (ms) => ms.status === "pending"
  ).length;

  return (
    <div className="xl:col-span-5 space-y-6">
      {/* ATS SCORE CARD */}
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
              className={`text-5xl font-extrabold tracking-tighter ${getScoreColor(
                displayScore
              )}`}
            >
              {displayScore}
            </motion.div>
            <span className="text-xs font-semibold text-muted-foreground mt-1">
              out of 100
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ALREADY STRONG BANNER */}
      {alreadyStrongBulletsCount > 0 && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-emerald-900 dark:text-emerald-300">
              {totalBulletsThatNeedEdits === 0
                ? "Wow, you have a very solid start!"
                : `${alreadyStrongBulletsCount} bullet point${
                    alreadyStrongBulletsCount > 1 ? "s were" : " was"
                  } already strong!`}
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
              {totalBulletsThatNeedEdits === 0
                ? "Your experience bullets already have strong action and impact, so we left them untouched and didn't force unnecessary AI rewrites."
                : `We left your ${alreadyStrongBulletsCount} strongest achievement bullet${
                    alreadyStrongBulletsCount > 1 ? "s" : ""
                  } untouched and only suggested WDI rewrites where needed.`}
            </p>
          </div>
        </div>
      )}

      {/* LIVE TEMPLATE SWITCHER */}
      <div className="bg-muted/50 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground pl-2">
          Active Layout:
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-8 text-xs whitespace-nowrap"
            onClick={() => onTemplateChange("starter")}
            size="sm"
            variant={templateType === "starter" ? "default" : "outline"}
          >
            1-Page Starter
          </Button>
          <Button
            className="h-8 text-xs whitespace-nowrap"
            onClick={() => onTemplateChange("experienced")}
            size="sm"
            variant={templateType === "experienced" ? "default" : "outline"}
          >
            2-Page Experienced
          </Button>
        </div>
      </div>

      {/* SCROLLABLE REVIEW LIST
          pl-1 / pt-1 give the card borders and shadows room so the scroll
          container doesn't clip them. */}
      <div className="space-y-8 max-h-[700px] overflow-y-auto pl-1 pr-3 pt-1 pb-10">
        {/* MISSING SKILLS CARD */}
        {missingSkills.length > 0 && (
          <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-lg ring-4 ring-amber-500/10 overflow-hidden">
            <CardHeader className="pb-4 bg-amber-100/80 dark:bg-amber-900/30 border-b-2 border-amber-500/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Missing Skills & Experience Gap
                </CardTitle>
                <span className="shrink-0 whitespace-nowrap text-[11px] font-bold bg-amber-600 text-white px-2.5 py-0.5 rounded-full">
                  {pendingSkillsCount > 0
                    ? `${pendingSkillsCount} to review`
                    : "All reviewed"}
                </span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                The job description asks for these, but they aren't on your
                resume. Only add the ones you genuinely have experience with.
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {missingSkills.map((ms) => (
                <div
                  key={ms.id}
                  className="p-3 rounded-lg bg-background border border-amber-500/40 flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-bold text-sm text-foreground leading-snug">
                        {ms.skill_name}
                      </p>
                      <span className="inline-block text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                        {ms.category}
                      </span>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-amber-700 dark:text-amber-400">
                      +{pointsPerEdit} Pts
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">{ms.reason}</p>

                  {ms.status === "pending" ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => onMissingSkillAction(ms.id, "dismissed")}
                        size="sm"
                        variant="ghost"
                      >
                        Skip
                      </Button>
                      <Button
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => onMissingSkillAction(ms.id, "added")}
                        size="sm"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add to Resume
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
                            <Check className="h-3 w-3 shrink-0" /> Added to{" "}
                            {ms.category}
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 shrink-0" /> Skipped
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* BULLET REWRITES */}
        <AnimatePresence>
          {resumeData.experience.map((exp, expIdx) => (
            <div key={expIdx} className="space-y-4">
              {exp.bullets.length > 0 && (
                <h3 className="font-bold text-lg text-primary border-b pb-2">
                  {exp.company_name}
                </h3>
              )}

              {exp.bullets.map((edit) => {
                if (
                  edit.status === "kept" ||
                  edit.needs_improvement === false
                ) {
                  return (
                    <motion.div
                      key={edit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4" /> Already Strong
                              — Left Alone
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
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

                return (
                  <motion.div
                    key={edit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className={editCardClass}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                            Wanted → Did → Impact Rewrite
                          </CardTitle>
                          <span className="shrink-0 whitespace-nowrap text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                            +{pointsPerEdit} Pts
                          </span>
                        </div>
                        <p className="text-sm italic text-muted-foreground mt-2 border-l-2 pl-3">
                          "{edit.original_text}"
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-3 bg-background p-3 rounded-md border border-primary/10">
                          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {edit.proposed_text}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Why: </strong>
                          {edit.reason}
                        </p>

                        {edit.status === "pending" ? (
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              className="border-destructive text-destructive hover:bg-destructive hover:text-white h-8"
                              onClick={() =>
                                onReviewBullet(expIdx, edit.id, "rejected")
                              }
                              size="sm"
                              variant="outline"
                            >
                              <X className="mr-1 h-3 w-3" /> Reject
                            </Button>
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                              onClick={() =>
                                onReviewBullet(expIdx, edit.id, "approved")
                              }
                              size="sm"
                            >
                              <Check className="mr-1 h-3 w-3" /> Approve
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end pt-1">
                            <span
                              className={`text-xs font-bold flex items-center gap-1 ${
                                edit.status === "approved"
                                  ? "text-emerald-600"
                                  : "text-destructive"
                              }`}
                            >
                              {edit.status === "approved" ? (
                                <>
                                  <Check className="h-3 w-3" /> Approved
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3" /> Rejected
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

      {/* EXPORT BUTTON */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          className="w-full text-lg shadow-xl hover:scale-[1.01] transition-transform bg-primary"
          onClick={onDownloadPDF}
          size="lg"
        >
          <Download className="mr-2 h-5 w-5" />
          {pendingEditsCount === 0
            ? "Export ATS-Clean PDF"
            : `Export PDF Now (${pendingEditsCount} unreviewed)`}
        </Button>
      </div>

      <div className="flex justify-center pb-4">
        <button
          onClick={onReset}
          className="text-sm font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
        >
          Start over with a new resume
        </button>
      </div>
    </div>
  );
};
