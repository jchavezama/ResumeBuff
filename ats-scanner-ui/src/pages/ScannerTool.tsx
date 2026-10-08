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

interface BulletPoint {
  id: string;
  original_text: string;
  proposed_text: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

interface Skill {
  category: string;
  description: string;
}

interface Experience {
  company_name: string;
  job_title: string;
  company_description: string;
  dates: string;
  bullets: BulletPoint[];
}

interface ResumeData {
  target_title: string;
  summary: string;
  skills: Skill[];
  experience: Experience[];
  base_score: number;
}

export default function ScannerTool() {
  // Appwrite Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Scanner State
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Builder State
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [currentScore, setCurrentScore] = useState(0);

  // Gamification Math
  const totalBullets = resumeData?.experience.reduce((acc, exp) => acc + exp.bullets.length, 0) || 0;
  const pointsPerEdit = totalBullets > 0 ? Math.floor((100 - (resumeData?.base_score || 0)) / totalBullets) : 0;
  const pendingEditsCount = resumeData?.experience.reduce((acc, exp) => acc + exp.bullets.filter((b) => b.status === "pending").length, 0) || 0;
  const isScanComplete = resumeData !== null;

  // 1. Check Session and Local Storage on Mount
  useEffect(() => {
    const savedState = localStorage.getItem("resumeBuffScanState");
    if (savedState) {
      try {
        const { resumeData: savedData, currentScore: savedScore } = JSON.parse(savedState);
        setResumeData(savedData);
        setCurrentScore(savedScore);
      } catch (e) {
        console.error("Failed to parse saved scan", e);
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

  // 2. Auto-save builder progress so they never lose edits if they refresh
  useEffect(() => {
    if (resumeData) {
      localStorage.setItem("resumeBuffScanState", JSON.stringify({ resumeData, currentScore }));
    }
  }, [resumeData, currentScore]);

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
        throw new Error(errData.detail || "Server error. Check Python terminal.");
      }

      const data = await response.json();
      
      // Inject "pending" review status into every nested bullet point
      const formattedData: ResumeData = {
        ...data,
        experience: data.experience.map((exp: any) => ({
          ...exp,
          bullets: exp.bullets.map((b: any) => ({ ...b, status: "pending" }))
        }))
      };

      setResumeData(formattedData);
      setCurrentScore(data.base_score);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deep state update to toggle bullet points inside specific companies
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

    if (decision === "approved") {
      setCurrentScore((prev) => Math.min(prev + pointsPerEdit, 100));
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
    setCurrentScore(0);
    setError("");
    localStorage.removeItem("resumeBuffScanState"); 
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("resume-preview");
    const opt = {
      margin: [0.4, 0, 0.4, 0], // Top, Right, Bottom, Left margins
      filename: "ResumeBuff_Optimized_Resume.pdf",
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
          {user ? `Welcome back, ${user.name.split(' ')[0]}` : "Welcome to ResumeBuff"}. Rebuild your resume into a high-converting ATS template.
        </p>
      </div>

      {!isScanComplete ? (
        /* --- UPLOAD VIEW --- */
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
                  placeholder="Paste the raw text of the job posting here..."
                  className="min-h-[160px] resize-none bg-muted/50 border-primary/30 focus-visible:ring-primary"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full text-lg h-14 rounded-full shadow-lg"
              onClick={handleScan}
              disabled={loading || !file || !jobDescription}
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
        /* --- LOGIN GATE VIEW --- */
        <Card className="border-primary/20 shadow-md bg-card max-w-2xl mx-auto">
          <CardContent className="p-16 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold">Template Built Successfully!</h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              We've successfully restructured your experience. Log in or create a free account to review your edits and export your high-converting PDF.
            </p>
            <Button size="lg" className="rounded-full text-lg h-14 px-8 mt-4" asChild>
              <Link to="/login">Log In / Sign Up to View Results</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* --- DUAL PANEL BUILDER VIEW --- */
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
              <AnimatePresence>
                {resumeData.experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-4">
                    {exp.bullets.length > 0 && (
                      <h3 className="font-bold text-lg text-primary border-b pb-2">{exp.company_name} Updates</h3>
                    )}
                    
                    {exp.bullets.map((edit) => (
                      <motion.div
                        key={edit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Card className={`border-l-4 shadow-sm transition-colors ${
                          edit.status === "approved" ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : 
                          edit.status === "rejected" ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10" : 
                          "border-l-primary"
                        }`}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                                Bullet Rewrite
                              </CardTitle>
                              <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                                +{pointsPerEdit} Pts
                              </span>
                            </div>
                            <p className="text-sm italic text-muted-foreground mt-2 border-l-2 pl-3">"{edit.original_text}"</p>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            <div className="flex items-start gap-3 bg-background p-3 rounded-md border border-primary/10">
                              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-medium text-foreground leading-snug">{edit.proposed_text}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground">Why: </strong>{edit.reason}
                            </p>
                            
                            {edit.status === "pending" && (
                              <div className="flex justify-end gap-2 pt-2">
                                <Button 
                                  size="sm"
                                  variant="outline" 
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-white h-8"
                                  onClick={() => handleReview(expIdx, edit.id, "rejected")}
                                >
                                  <X className="mr-1 h-3 w-3" /> Reject
                                </Button>
                                <Button 
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                  onClick={() => handleReview(expIdx, edit.id, "approved")}
                                >
                                  <Check className="mr-1 h-3 w-3" /> Approve
                                </Button>
                              </div>
                            )}

                            {edit.status !== "pending" && (
                              <div className="flex justify-end pt-1">
                                <span className={`text-xs font-bold flex items-center gap-1 ${
                                  edit.status === "approved" ? "text-emerald-600" : "text-destructive"
                                }`}>
                                  {edit.status === "approved" ? <><Check className="h-3 w-3" /> Approved</> : <><X className="h-3 w-3" /> Rejected</>}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {pendingEditsCount === 0 && (
              <div className="flex justify-center pt-2">
                <Button 
                  size="lg" 
                  onClick={handleDownloadPDF}
                  className="w-full text-lg shadow-xl hover:scale-[1.02] transition-transform bg-primary"
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
            {/* The Aspect Ratio container mimics an 8.5 x 11 piece of paper */}
            <div 
              id="resume-preview" 
              className="bg-white text-black p-10 shadow-2xl border border-gray-200 w-full max-w-[850px] aspect-[8.5/11] overflow-hidden font-sans text-left"
            >
              {/* Header: Name, Target Title & Summary */}
              <div className="border-b-2 border-emerald-600 pb-5 mb-5">
                <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">{user?.name || "Your Name"}</h1>
                <h2 className="text-lg font-bold text-emerald-600 mt-2 uppercase tracking-widest">{resumeData.target_title}</h2>
                <p className="text-[14px] text-gray-700 mt-3 leading-relaxed">{resumeData.summary}</p>
              </div>

              {/* Skills Section */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-emerald-600 tracking-widest mb-3 uppercase">Skills</h3>
                <div className="space-y-1.5">
                  {resumeData.skills.map((skill, idx) => (
                    <p key={idx} className="text-[13px] text-gray-800 leading-snug">
                      <strong className="text-gray-900">{skill.category}</strong> - {skill.description}
                    </p>
                  ))}
                </div>
              </div>

              {/* Experience Section */}
              <div>
                <h3 className="text-sm font-bold text-emerald-600 tracking-widest mb-4 uppercase">Experience</h3>
                <div className="space-y-6">
                  {resumeData.experience.map((exp, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-gray-900 text-[15px]">
                          {exp.company_name} <span className="font-normal mx-1">-</span> <span className="font-medium italic text-gray-700">{exp.job_title}</span>
                        </h4>
                      </div>
                      <p className="text-[12px] text-gray-400 mb-2 uppercase tracking-wider">{exp.dates}</p>
                      {exp.company_description && (
                        <p className="text-[13px] italic text-gray-500 mb-2">{exp.company_description}</p>
                      )}
                      
                      <ul className="list-disc list-outside ml-5 space-y-1.5 mt-2">
                        {exp.bullets.map((b) => (
                          <li key={b.id} className="text-[13px] text-gray-800 leading-snug pl-1">
                            {b.status === 'approved' ? (
                               /* Subtle green highlight for approved changes */
                               <span className="bg-emerald-100/70 font-medium transition-colors px-0.5">{b.proposed_text}</span> 
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
            </div>
          </div>

        </div>
      )}
    </div>
  );
}