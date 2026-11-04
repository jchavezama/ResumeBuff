import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Database, Cloud, EyeOff, HardDrive, Trash2 } from "lucide-react";

const CONTACT_EMAIL = "contact@resumebuff.com";

interface Section {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const sections: Section[] = [
  {
    icon: Database,
    title: "What We Collect",
    body: (
      <>
        <p>
          <strong className="text-foreground">Account information.</strong> When you sign up we collect your name,
          email address, and password. Accounts and sign-in are handled by Appwrite, our authentication provider.
        </p>
        <p>
          <strong className="text-foreground">Resume content.</strong> When you build a resume, you give us a PDF of
          your resume and the text of a job description. This can include personal details such as your name, email,
          location, links, education, and work history.
        </p>
      </>
    ),
  },
  {
    icon: Cloud,
    title: "How Your Resume Is Processed",
    body: (
      <>
        <p>
          Your PDF is sent to our API, which is hosted on Render. The API reads the text from the PDF in memory and
          sends that text, along with the job description, to an AI model provider (currently Groq) to produce your
          structured resume and suggested edits. The results are sent back to your browser.
        </p>
        <p>
          We do not save your PDF or its text to a database or file storage, and we have configured our application not
          to write resume contents to its logs. Our hosting providers may keep standard technical logs, such as
          timestamps and IP addresses, as part of running their services.
        </p>
      </>
    ),
  },
  {
    icon: EyeOff,
    title: "Third-Party Services",
    body: (
      <>
        <p>To operate ResumeBuff we rely on these services, each of which handles data under its own terms:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong className="text-foreground">Appwrite</strong>: account creation and sign-in.
          </li>
          <li>
            <strong className="text-foreground">Render</strong>: hosting for our API.
          </li>
          <li>
            <strong className="text-foreground">Groq</strong>: running the AI model that analyzes your resume text and
            the job description.
          </li>
        </ul>
        <p>
          We do not use your resume to train AI models. Because your resume text is sent to the AI provider to generate
          your edits, we encourage you to review that provider&apos;s privacy policy and terms. Please don&apos;t include
          information in your resume or job description that you are not comfortable sharing with them.
        </p>
      </>
    ),
  },
  {
    icon: HardDrive,
    title: "Saved in Your Browser",
    body: (
      <>
        <p>
          So your work isn&apos;t lost when you sign in or refresh the page, the resume we generate for you, including
          text taken from your original resume, is saved in your browser&apos;s local storage on your own device. It is
          not sent anywhere else by this feature.
        </p>
        <p>
          Click &ldquo;Start over with a new resume&rdquo; or clear this site&apos;s data in your browser settings to
          remove it. If you use a shared or public computer, we recommend doing this when you are finished.
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    title: "What We Don't Do",
    body: (
      <p>
        We do not sell your personal data, email address, or employment history. We do not share your resume with
        recruiters, employers, or data brokers, and we do not use your resume for advertising.
      </p>
    ),
  },
  {
    icon: Trash2,
    title: "Retention, Deletion & Contact",
    body: (
      <>
        <p>
          We keep your account information for as long as your account is open. To delete your account and associated
          data, or if you have any questions about this policy, email us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          We may update this policy as ResumeBuff changes. When we do, we will change the &ldquo;Last updated&rdquo;
          date above.
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-col items-center py-8 sm:py-12 px-4">
      <div className="max-w-4xl w-full space-y-6 sm:space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Last updated: October 7, 2026</p>
        </div>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary flex-shrink-0" />
              How We Handle Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <p>
              Your resume contains sensitive personal and professional information. This policy explains what
              ResumeBuff collects, where it goes, and what stays on your own device.
            </p>

            {sections.map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-6">
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" /> {title}
                  </h3>
                  <div className="space-y-4">{body}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
