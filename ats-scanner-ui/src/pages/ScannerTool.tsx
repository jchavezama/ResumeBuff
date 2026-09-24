import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { account } from "../appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Check, X, Loader2, FileText, ArrowRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EditProposal {
  id: string;
  original_text: string;
  proposed_text: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
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

  // Gamification State
  const [baseScore, setBaseScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [edits, setEdits] = useState<EditProposal[]>([]);

  const pointsPerEdit = edits.length > 0 ? Math.floor((100 - baseScore) / edits.length) : 0;
  const isScanComplete = edits.length > 0 || baseScore > 0;
  const pendingEditsCount = edits.filter((e) => e.status === "pending").length;

  // 1. Check Appwrite Session on Mount
  useEffect(() => {
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

      // Call the FastAPI Python backend
      const response = await fetch("https://resumebuff-api.onrender.com/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Grab the exact error message from Python instead of the hardcoded string
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Server error. Check Python terminal.");
      }

      const data = await response.json();
      
      // Initialize gamification state
      setBaseScore(data.base_score);
      setCurrentScore(data.base_score);
      
      const formattedEdits = data.proposed_edits.map((edit: any) => ({
        ...edit,
        status: "pending",
      }));
      setEdits(formattedEdits);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (id: string, decision: "approved" | "rejected") => {
    setEdits((prev) =>
      prev.map((edit) =>
        edit.id === id ? { ...edit, status: decision } : edit
      )
    );

    if (decision === "approved") {
      setCurrentScore((prev) => Math.min(prev + pointsPerEdit, 100));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-destructive";
  };

    const handleReset = () => {
      setFile(null);
      setBaseScore(0);
      setCurrentScore(0);
      setEdits([]);
      setError("");
    };

  const handleDownload = () => {
    // Filter for only the edits the user explicitly approved
    const approvedEdits = edits.filter((e) => e.status === "approved");

    let fileContent = "RESUMEBUFF - OPTIMIZED BULLET POINTS\n";
    fileContent += "========================================\n\n";

    if (approvedEdits.length === 0) {
      fileContent += "No edits were approved during this session.\n";
    } else {
      approvedEdits.forEach((edit, index) => {
        fileContent += `[Update ${index + 1}]\n`;
        fileContent += `OLD: ${edit.original_text}\n`;
        fileContent += `NEW: ${edit.proposed_text}\n`;
        fileContent += `----------------------------------------\n\n`;
      });
    }

    // Create a Blob containing the text and trigger a native browser download
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ResumeBuff_Optimized_Bullets.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Show a loading spinner while Appwrite checks the session
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Appwrite Authentication Guard: If not logged in, prompt them to log in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Access Restricted</h1>
        <p className="text-xl text-muted-foreground">
          ResumeBuff's ATS scanner requires a free account to process PDF files and generate AI edits.
        </p>
        <Button size="lg" className="rounded-full text-lg h-14 px-8 mt-4" asChild>
          <Link to="/login">Log In / Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">ATS Scanner</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back, {user.name.split(' ')[0]}. Upload your resume and approve AI edits to boost your score.
        </p>
      </div>

      {!isScanComplete ? (
        /* --- UPLOAD VIEW --- */
        <Card className="border-primary/20 shadow-md bg-card">
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
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Formatting & Keywords...
                </>
              ) : (
                "Scan Resume against Job Description"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* --- RESULTS & REVIEW VIEW --- */
        <div className="space-y-8">
          <Card className="border-primary/20 shadow-md">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Match Score</h2>
                <p className="text-muted-foreground mt-1">
                  {pendingEditsCount > 0
                    ? `Review ${pendingEditsCount} edits to improve your score.`
                    : "Review complete! You are ready to apply."}
                </p>
              </div>
              <div className="flex flex-col items-center">
                <motion.div
                  key={currentScore}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-6xl font-extrabold tracking-tighter ${getScoreColor(currentScore)}`}
                >
                  {currentScore}
                </motion.div>
                <span className="text-sm font-semibold text-muted-foreground mt-1">out of 100</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <AnimatePresence>
              {edits.map((edit) => (
                <motion.div
                  key={edit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`border-l-4 shadow-sm transition-colors ${
                    edit.status === "approved" ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20" : 
                    edit.status === "rejected" ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10" : 
                    "border-l-primary"
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                          Suggested Edit
                        </CardTitle>
                        <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
                          +{pointsPerEdit} Points
                        </span>
                      </div>
                      <p className="text-sm italic text-muted-foreground mt-2 border-l-2 pl-3">"{edit.original_text}"</p>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3 bg-background p-4 rounded-md border border-primary/10">
                        <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="font-medium text-foreground">{edit.proposed_text}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Why: </strong>{edit.reason}
                      </p>
                      
                      {edit.status === "pending" && (
                        <div className="flex justify-end gap-3 pt-2">
                          <Button 
                            variant="outline" 
                            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleReview(edit.id, "rejected")}
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleReview(edit.id, "approved")}
                          >
                            <Check className="mr-1 h-4 w-4" /> Approve Change
                          </Button>
                        </div>
                      )}

                      {edit.status !== "pending" && (
                        <div className="flex justify-end pt-2">
                          <span className={`text-sm font-bold flex items-center gap-1 ${
                            edit.status === "approved" ? "text-green-600" : "text-destructive"
                          }`}>
                            {edit.status === "approved" ? <><Check className="h-4 w-4" /> Approved</> : <><X className="h-4 w-4" /> Rejected</>}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {pendingEditsCount === 0 && edits.length > 0 && (
            <div className="flex justify-center pt-8">
              <Button 
              size="lg" 
              onClick={handleDownload}
              className="rounded-full px-8 text-lg shadow-xl hover:scale-105 transition-transform"
            >
                Download Approved Edits (.txt)
              </Button>
              <button 
                onClick={handleReset}
                className="text-sm font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
              >
                Scan another resume
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}