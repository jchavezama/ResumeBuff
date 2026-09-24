import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, EyeOff } from "lucide-react";

export default function Privacy() {
  return (
    <div className="flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">
            Last updated: September 23, 2026
          </p>
        </div>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              How We Handle Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <p>
              At ResumeBuff, we understand that your resume contains highly sensitive personal and professional information. This policy outlines exactly how your data is processed when using our ATS scanning tools.
            </p>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" /> Data Storage & Security
              </h3>
              <p>
                All uploaded PDF resumes are temporarily stored in secured cloud storage buckets powered by Appwrite. These files are strictly used for the duration of the AI parsing process. We do not sell your personal data, email addresses, or employment history to third-party recruiters or data brokers.
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-primary" /> AI Processing
              </h3>
              <p>
                To provide accurate ATS feedback, your resume text and the provided job description are sent to our language model partners (e.g., OpenAI, Anthropic). We utilize enterprise API endpoints, meaning your personal resume data is <strong>never</strong> used to train public AI models. 
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Contact</h3>
              <p>
                If you have questions about this privacy policy or wish to request the immediate deletion of your account and associated scan records, please contact the developer at <strong>contact@resumebuff.com</strong>.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}