import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { account } from "../appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Check, X, Loader2, FileText, ArrowRight, Lock, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import html2pdf from "html2pdf.js";

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

interface BulletPoint {
  id: string;
  original_text: string;
  proposed_text: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
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
  experience: Experience[];
  base_score: number;
}

const STORAGE_KEY = "resumeBuffScanState";

// Converts ANY incoming data (API response or old localStorage) into the exact
// shape the UI needs, so a missing/odd field can never crash the render.
const normalizeResume = (data: any, resetStatus = false): ResumeData => ({
  contact: {
    name: data?.contact?.name ?? "",
    email: data?.contact?.email ?? "",
    location: data?.contact?.location ?? "",
    links: data?.contact?.links ?? "",
  },
  education: Array.isArray(data?.education)
    ? data.education.map((e: any) => ({
        institution: e?.institution ?? "",
        degree: e?.degree ?? "",
      }))
    : [],
  target_title: data?.target_title ?? "",
  summary: data?.summary ?? "",
  base_score: Number(data?.base_score) || 0,
  skills: Array.isArray(data?.skills)
    ? data.skills.map((s: any) => {
        const raw = typeof s === "string" ? s : s?.items ?? s?.skills ?? s?.list ?? [];
        const items: string[] = Array.isArray(raw)
          ? raw.map((x: any) => String(x))
          : typeof raw === "string"
          ? raw.split(",").map((x: string) => x.trim()).filter(Boolean)
          : [];
        return { category: s?.category ?? s?.name ?? "Skills", items };
      }).filter((s: Skill) => s.items.length > 0)
    : [],
  experience: Array.isArray(data?.experience)
    ? data.experience.map((exp: any, expIdx: number) => ({
        company_name: exp?.company_name ?? "",
        job_title: exp?.job_title ?? "",
        company_description: exp?.company_description ?? "",
        dates: exp?.dates ?? "",
        bullets: Array.isArray(exp?.bullets)
          ? exp.bullets.map((b: any, i: number) => ({
              id: b?.id ? String(b.id) : `exp${expIdx}-b${i}`,
              original_text: b?.original_text ?? "",
              proposed_text: b?.proposed_text ?? "",
              reason: b?.reason ?? "",
              status: resetStatus
                ? "pending"
                : b?.status === "approved" || b?.status === "rejected"
                ? b.status
                : "pending",
            }))
          : [],
      }))
    : [],
});

export default function ScannerTool() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const totalBullets = resumeData?.experience.reduce((acc, exp) => acc + exp.bullets.length, 0) || 0;
  const approvedCount =
    resumeData?.experience.reduce((acc, exp) => acc + exp.bullets.filter((b) => b.status === "approved").length, 0) || 0;
  const pendingEditsCount =
    resumeData?.experience.reduce((acc, exp) => acc + exp.bullets.filter((b) => b.status === "pending").length, 0) || 0;
  const baseScore = resumeData?.base_score || 0;

  // Score is derived from approvals, so it can never drift from the saved data,
  // and approving every edit lands exactly on 100.
  const pointsPerEdit = totalBullets > 0 ? (100 - baseScore) / totalBullets : 0;
  const currentScore = Math.min(100, Math.round(baseScore + approvedCount * pointsPerEdit));
  const isScanComplete = resumeData !== null;

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const { resumeData: savedData } = JSON.parse(savedState);
        if (savedData) {
          setResumeData(normalizeResume(savedData));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to parse saved scan", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const checkSession = async () => {
      try {
        const currentAccount = await account.get();
        setUser(currentAccount);
      } catch (error) {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (resumeData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ resumeData }));
      } catch (e) {
        console.error("Failed to save scan", e);
      }
    }
  }, [resumeData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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

      const response = await fetch("https://resumebuff-api.onrender.com/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail =
          typeof errData.detail === "string" ? errData.detail : errData.detail ? JSON.stringify(errData.detail) : "";
        throw new Error(detail || "Server error. Please try again.");
      }

      const data = await response.json();
      console.log("API response:", data);

      setResumeData(normalizeResume(data, true));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (expIndex: number, bulletId: string, decision: "approved" | "rejected") => {
    setResumeData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      newData.experience = [...newData.experience];
      newData.experience[expIndex] = { ...newData.experience[expIndex] };
      newData.experience[expIndex].bullets = newData.experience[expIndex].bullets.map((b) =>
        b.id === bulletId ? { ...b, status: decision } : b
      );
      return newData;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-yellow-600";
    return "text-destructive";
  };

  const handleReset = () => {
    setFile(null);
    setResumeData(null);
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("resume-preview");
    if (!element) return;
    const safeName = (resumeData?.contact.name || user?.name || "Resume").replace(/\s+/g, "_");
    const opt = {
      margin: [0.4, 0, 0.4, 0] as [number, number, number, number],
      filename: `${safeName}_Resume.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
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
        <h1 className="text-4xl font-extrabold tracking-tight">AI Resume Builder</h1>
        <p className="text-muted-foreground text-lg">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome to ResumeBuff"}. Rebuild your resume into a
          high-converting ATS template.
        </p>
      </div>

      {!isScanComplete ? (
        <Card className="border-primary/20 shadow-md bg-card max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-8">
            {error && <div className="p-4 bg-destructive/10 text-destructive rounded-md font-medium">{error}</div>}

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> 1. Upload Resume (PDF)
                </label>
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-primary mb-2" />
                  <span className="font-medium text-center">{file ? file.name : "Drag & drop or click to browse"}</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> 2. Paste Job Description
                </label>
                <Textarea
                  className="min-h-[160px] resize-none bg-muted/50 border-primary/30 focus-visible:ring-primary"
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the raw text of the job posting here..."
                  value={jobDescription}
                />
              </div>
            </div>

            <Button
              className="w-full text-lg h-14 rounded-full shadow-lg"
              disabled={loading || !file || !jobDescription}
              onClick={handleScan}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Structuring Template & Generating Edits...
                </>
              ) : (
                "Build ATS-Optimized Resume"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : !user ? (
        <Card className="border-primary/20 shadow-md bg-card max-w-2xl mx-auto">
          <CardContent className="p-16 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Template Built Successfully!</h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We've successfully restructured your experience. Log in or create a free account to review your edits and
              export your high-converting PDF.
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
                  <h2 className="text-2xl font-bold">Match Score</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {pendingEditsCount > 0
                      ? `Review ${pendingEditsCount} edits to improve your score.`
                      : "Review complete! You are ready to export."}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <motion.div
                    key={currentScore}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-5xl font-extrabold tracking-tighter ${getScoreColor(currentScore)}`}
                  >
                    {currentScore}
                  </motion.div>
                  <span className="text-xs font-semibold text-muted-foreground mt-1">out of 100</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8 max-h-[750px] overflow-y-auto pr-2 pb-10">
              {resumeData!.experience.map((exp, expIdx) => (
                <div key={expIdx} className="space-y-4">
                  {exp.bullets.length > 0 && (
                    <h3 className="font-bold text-lg text-primary border-b pb-2">{exp.company_name} Updates</h3>
                  )}

                  <AnimatePresence>
                    {exp.bullets.map((edit) => (
                      <motion.div
                        key={edit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Card
                          className={`border-l-4 shadow-sm transition-colors ${
                            edit.status === "approved"
                              ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : edit.status === "rejected"
                              ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10"
                              : "border-l-primary"
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                                Bullet Rewrite
                              </CardTitle>
                              <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                                +{Math.round(pointsPerEdit)} Pts
                              </span>
                            </div>
                            <p className="text-sm italic text-muted-foreground mt-2 border-l-2 pl-3">
                              "{edit.original_text}"
                            </p>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div className="flex items-start gap-3 bg-background p-3 rounded-md border border-primary/10">
                              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-medium text-foreground leading-snug">{edit.proposed_text}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground">Why: </strong>
                              {edit.reason}
                            </p>

                            {edit.status === "pending" && (
                              <div className="flex justify-end gap-2 pt-2">
                                <Button
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-white h-8"
                                  onClick={() => handleReview(expIdx, edit.id, "rejected")}
                                  size="sm"
                                  variant="outline"
                                >
                                  <X className="mr-1 h-3 w-3" /> Reject
                                </Button>
                                <Button
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                  onClick={() => handleReview(expIdx, edit.id, "approved")}
                                  size="sm"
                                >
                                  <Check className="mr-1 h-3 w-3" /> Approve
                                </Button>
                              </div>
                            )}

                            {edit.status !== "pending" && (
                              <div className="flex justify-end pt-1">
                                <span
                                  className={`text-xs font-bold flex items-center gap-1 ${
                                    edit.status === "approved" ? "text-emerald-600" : "text-destructive"
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
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {pendingEditsCount === 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  className="w-full text-lg shadow-xl hover:scale-[1.02] transition-transform bg-primary"
                  onClick={handleDownloadPDF}
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" /> Export PDF
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

          {/* RIGHT PANEL: Live PDF Preview */}
          <div className="xl:col-span-7 sticky top-8 flex justify-center">
            <div
              id="resume-preview"
              className="bg-white text-black p-10 shadow-2xl border border-gray-200 w-full max-w-[850px] aspect-[8.5/11] overflow-hidden font-sans text-left flex flex-col"
            >
              {/* HEADER: Name & Contact Extracted directly from Resume */}
              <div className="border-b-2 border-emerald-600 pb-4 mb-4 text-center">
                <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">
                  {resumeData!.contact.name || user?.name || "Your Name"}
                </h1>
                <p className="text-sm text-gray-600 mt-2">
                  {[resumeData!.contact.location, resumeData!.contact.email, resumeData!.contact.links]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
                <h2 className="text-lg font-bold text-emerald-600 mt-3 uppercase tracking-widest">
                  {resumeData!.target_title}
                </h2>
                <p className="text-[14px] text-gray-700 mt-2 leading-relaxed text-left">{resumeData!.summary}</p>
              </div>

              {/* SKILLS SECTION */}
              {resumeData!.skills.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-emerald-600 tracking-widest mb-2 uppercase border-b pb-1">
                    Technical Skills
                  </h3>
                  <div className="space-y-1">
                    {resumeData!.skills.map((skill, idx) => (
                      <p key={idx} className="text-[13px] text-gray-800 leading-snug">
                        <strong className="text-gray-900">{skill.category}:</strong> {skill.items.join(", ")}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* EXPERIENCE SECTION */}
              <div className="flex-grow">
                <h3 className="text-sm font-bold text-emerald-600 tracking-widest mb-3 uppercase border-b pb-1">
                  Experience
                </h3>
                <div className="space-y-5">
                  {resumeData!.experience.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-gray-900 text-[15px]">
                          {exp.company_name} <span className="font-normal mx-1">-</span>{" "}
                          <span className="font-medium italic text-gray-700">{exp.job_title}</span>
                        </h4>
                        {exp.dates && (
                          <span className="text-[12px] text-gray-500 uppercase tracking-wider">{exp.dates}</span>
                        )}
                      </div>
                      {exp.company_description && (
                        <p className="text-[13px] italic text-gray-500 mb-2">{exp.company_description}</p>
                      )}

                      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
                        {exp.bullets.map((b) => (
                          <li key={b.id} className="text-[13px] text-gray-800 leading-snug pl-1">
                            {b.status === "approved" ? (
                              <span className="bg-emerald-100/70 font-medium transition-colors px-0.5">
                                {b.proposed_text}
                              </span>
                            ) : (
                              b.original_text
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* EDUCATION SECTION */}
              {resumeData!.education.length > 0 && (
                <div className="mt-5 pt-4">
                  <h3 className="text-sm font-bold text-emerald-600 tracking-widest mb-2 uppercase border-b pb-1">
                    Education
                  </h3>
                  <div className="space-y-2">
                    {resumeData!.education.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline">
                        <p className="text-[14px] font-bold text-gray-900">{edu.institution}</p>
                        <p className="text-[13px] italic text-gray-700">{edu.degree}</p>
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
