import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import type { TemplateType } from "@/types/resume";
import AnalysisProgress from "./AnalysisProgress";

interface ResumeUploaderProps {
  file: File | null;
  jobDescription: string;
  templateType: TemplateType;
  loading: boolean;
  /** True for a brief moment after the response arrives so the bar can reach 100%. */
  finishing?: boolean;
  error: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onJobDescChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTemplateChange: (type: TemplateType) => void;
  onScan: () => void;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  file,
  jobDescription,
  templateType,
  loading,
  finishing = false,
  error,
  onFileUpload,
  onJobDescChange,
  onTemplateChange,
  onScan,
}) => {
  const isScanDisabled = loading || !file || !jobDescription;

  const getCardStyle = (type: TemplateType) =>
    templateType === type
      ? "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-primary bg-primary/5 shadow-sm"
      : "p-5 rounded-xl border-2 cursor-pointer transition-all text-left space-y-2 border-border hover:border-primary/40 bg-muted/30";

  return (
    <Card className="border-primary/20 shadow-md bg-card max-w-4xl mx-auto">
      <CardContent className="p-8 space-y-8">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: TEMPLATE SELECTION */}
        <div className="space-y-4">
          <label className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> 1. Choose Your Career
            Stage & Template
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div
              onClick={() => onTemplateChange("starter")}
              className={getCardStyle("starter")}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> 1-Page
                  Consolidated
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                  Recommended for Starters
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Recommended for students and early-career candidates. Cuts
                redundancy, places education near the top, and keeps everything
                strictly to 1 crisp page.
              </p>
            </div>

            <div
              onClick={() => onTemplateChange("experienced")}
              className={getCardStyle("experienced")}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-base flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> 2-Page
                  Comprehensive
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                  Experienced Professionals
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Recommended for experienced professionals. Includes room for an
                executive summary, company context descriptions, and multi-year
                history across up to 2 pages.
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2 & 3: UPLOAD AND JOB DESCRIPTION */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> 2. Upload Resume
              (PDF)
            </label>
            {/* Fixed height (h-48) so it always matches the job description box */}
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer relative h-48">
              <input
                type="file"
                accept=".pdf"
                onChange={onFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-10 w-10 text-primary mb-2" />
              <span className="font-medium text-center max-w-full truncate">
                {file ? file.name : "Drag & drop or click to browse"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> 3. Paste Job
              Description
            </label>
            {/* Fixed height (h-48), scrolls when the pasted text is long.
                [field-sizing:fixed] overrides the auto-grow behavior in newer shadcn Textarea. */}
            <Textarea
              className="h-48 min-h-0 resize-none overflow-y-auto [field-sizing:fixed] bg-muted/50 border-primary/30 focus-visible:ring-primary"
              onChange={onJobDescChange}
              placeholder="Paste the raw text of the job posting here..."
              value={jobDescription}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full text-lg h-14 rounded-full shadow-lg"
            disabled={isScanDisabled}
            onClick={onScan}
            size="lg"
          >
            {loading
              ? "Analyzing your resume..."
              : `Build ${
                  templateType === "starter"
                    ? "1-Page Starter"
                    : "2-Page Experienced"
                } Resume`}
          </Button>

          {/* Rotating status messages + progress bar while the backend works */}
          {loading && <AnalysisProgress done={finishing} />}
        </div>
      </CardContent>
    </Card>
  );
};
