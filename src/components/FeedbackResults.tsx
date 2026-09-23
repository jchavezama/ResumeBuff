import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Define the shape of our expected AI output
export interface ATSFeedback {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  formatting_issues: { issue_type: string; severity: string; fix_suggestion: string }[];
  bullet_point_rewrites: { original_bullet: string; ai_rewrite: string; reasoning: string }[];
  final_verdict: string;
}

export default function FeedbackResults({ data, onReset }: { data: ATSFeedback, onReset: () => void }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Score Card */}
      <Card className="border-primary/50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">ATS Match Score</CardTitle>
          <CardDescription>Based on semantic analysis against the job description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center items-center space-x-4">
            <span className="text-5xl font-bold text-primary">{data.match_score}%</span>
          </div>
          <Progress value={data.match_score} className="h-3 w-full" />
          <p className="text-center font-medium">{data.final_verdict}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Keywords Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Keyword Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">Matched Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {data.matched_keywords.map(kw => (
                  <span key={kw} className="px-2 py-1 bg-green-500/10 text-green-600 rounded text-sm">{kw}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-red-600 mb-2">Missing Keywords (Critical)</h4>
              <div className="flex flex-wrap gap-2">
                {data.missing_keywords.map(kw => (
                  <span key={kw} className="px-2 py-1 bg-red-500/10 text-red-600 rounded text-sm">{kw}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formatting Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Formatting Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            {data.formatting_issues.length === 0 ? (
              <p className="text-green-600">No ATS parsing issues detected!</p>
            ) : (
              <ul className="space-y-3">
                {data.formatting_issues.map((issue, idx) => (
                  <li key={idx} className="p-3 border rounded-md border-red-500/20 bg-red-500/5">
                    <span className="font-bold text-red-500">[{issue.severity}] {issue.issue_type}:</span> {issue.fix_suggestion}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bullet Point Rewrites */}
      <Card>
        <CardHeader>
          <CardTitle>AI Resume Rewrites</CardTitle>
          <CardDescription>We identified weak action verbs and rewrote them for higher impact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.bullet_point_rewrites.map((rewrite, idx) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2 bg-muted/50">
              <p className="text-sm text-muted-foreground line-through decoration-red-500/50">
                {rewrite.original_bullet}
              </p>
              <p className="font-medium text-primary">
                ✨ {rewrite.ai_rewrite}
              </p>
              <p className="text-xs text-muted-foreground italic">
                Reasoning: {rewrite.reasoning}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center">
        <button onClick={onReset} className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
          Scan Another Resume
        </button>
      </div>

    </div>
  );
}