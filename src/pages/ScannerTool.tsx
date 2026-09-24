import { useState, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import FeedbackResults, { type ATSFeedback } from "../components/FeedbackResults";
import { storage, databases, ID } from "../appwrite";
import { Loader2 } from "lucide-react";

// --- MOCK DATA FOR PRESENTATION ---
const mockAIResponse: ATSFeedback = {
  match_score: 68,
  matched_keywords: ["React", "Python", "REST APIs", "PostgreSQL"],
  missing_keywords: ["CI/CD Pipeline", "AWS", "Agile/Scrum"],
  formatting_issues: [
    { issue_type: "Multi-column Layout", severity: "High", fix_suggestion: "Older ATS systems parse left-to-right. Move all skills to a single column list." }
  ],
  bullet_point_rewrites: [
    { 
      original_bullet: "Worked on the company's main website using React.", 
      ai_rewrite: "Developed and maintained the core React web application, improving page load speed by 15% through optimized component rendering.", 
      reasoning: "Original lacked quantifiable metrics and strong action verbs." 
    },
    {
      original_bullet: "Helped make a backend API in Python.",
      ai_rewrite: "Architected a scalable REST API using Python and FastAPI, handling 500+ daily requests.",
      reasoning: "Clarified the technology used and added scope/scale."
    }
  ],
  final_verdict: "Strong technical foundation, but your impact is hidden behind weak phrasing. Add more data-driven metrics."
};
// ----------------------------------

function ScannerTool() {
  const BUCKET_ID = "6ab40706000f0e1fa876";
  const DATABASE_ID = "6ab40adc0017843a421d";
  const COLLECTION_ID = "6ab40b370006e03c0e62";

  const [appState, setAppState] = useState<"idle" | "analyzing" | "complete">("idle");
  const [loadingText, setLoadingText] = useState("Extracting text from PDF...");

  const handleScan = async (file: File, jobDesc: string) => {
    try {
      // 1. Upload & Save to Database (Working!)
      const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), file);
      await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        file_id: uploadedFile.$id,
        job_description: jobDesc,
        status: "pending"
      });

      // 2. Trigger the "Analyzing" state for the presentation
      setAppState("analyzing");

    } catch (error) {
      console.error("Pipeline failed:", error);
    }
  };

  // 3. Simulate the AI processing steps
  useEffect(() => {
    if (appState === "analyzing") {
      const timer1 = setTimeout(() => setLoadingText("Parsing layout and converting to Markdown..."), 2000);
      const timer2 = setTimeout(() => setLoadingText("Cross-referencing Job Description with OpenAI..."), 4000);
      const timer3 = setTimeout(() => setLoadingText("Generating strict ATS feedback..."), 6000);
      const timer4 = setTimeout(() => setAppState("complete"), 8000);

      return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
    }
  }, [appState]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">ResumeBuff</h1>
          <p className="text-muted-foreground text-lg">
            Bypass ATS filters. Upload your resume and the job description to get actionable, AI-driven feedback.
          </p>
        </div>

        {/* The View Router */}
        {appState === "idle" && (
          <ResumeUploader onScan={handleScan} />
        )}

        {appState === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in duration-500">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-xl font-medium text-muted-foreground animate-pulse">{loadingText}</p>
        </div>
)}

        {appState === "complete" && (
          <FeedbackResults data={mockAIResponse} onReset={() => setAppState("idle")} />
        )}

      </div>
    </div>
  );
}

export default ScannerTool;