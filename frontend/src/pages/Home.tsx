import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, FileSearch, Sparkles, Target, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// Helper component for fading in sections as you scroll down
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  return (
    <div className="flex flex-col items-center overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative w-full py-16 md:py-32 px-4 flex flex-col items-center text-center">
        {/* Abstract background blur for a "slick" modern feel */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <FadeIn>
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs sm:text-sm font-medium text-primary mb-6 md:mb-8">
            <Sparkles className="mr-2 h-4 w-4" /> Free AI resume builder
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto text-foreground">
            Build a resume the <br className="hidden md:block" />
            <span className="text-primary">machines can read.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload your resume and paste a job description. ResumeBuff rebuilds your real experience into a clean,
            single-column template and suggests tailored rewrites. You approve every change.
          </p>
          <div className="flex justify-center gap-4 mt-8 md:mt-10">
            <Button
              size="lg"
              className="h-14 px-8 text-base sm:text-lg rounded-full shadow-lg hover:shadow-primary/25 transition-all"
              asChild
            >
              <Link to="/scanner">
                Build Your Resume <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/50 border-y border-border/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <FadeIn>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Your resume gets read by software first.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Many employers use Applicant Tracking Systems to sort applications before a person ever looks at them.
                Multi-column layouts, graphics, and text that is hard to parse can cause your experience to be
                misread or missed, even when you are qualified.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Wording matters too. When your resume doesn&apos;t echo the language of the job posting, the match can
                look weaker than it really is.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <Bot className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-xl font-bold">The Resume Parser</h3>
                <p className="text-sm text-muted-foreground">
                  Reads your resume as plain text and looks for the skills and experience a job asks for. Anything it
                  can&apos;t read cleanly is easy to overlook.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </section>

      {/* 3. OUR FIX */}
      <section className="w-full py-16 md:py-32 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-12 md:space-y-16">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-bold">How ResumeBuff works.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
              Drop in your resume and a job description. We rebuild your experience into a clean template, suggest
              rewrites for each bullet, and let you review them one at a time before you export.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 w-full">
            <FadeIn delay={0.1}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <FileSearch className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">Clean, Parser-Friendly Layout</h3>
                  <p className="text-sm text-muted-foreground">
                    We pull your name, contact details, skills, education and experience from your PDF and place them
                    in a simple single-column template, with no graphics or tables to trip up a parser.
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.2}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <Target className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">Tailored to the Job</h3>
                  <p className="text-sm text-muted-foreground">
                    We compare your experience to the job description and reword your bullets with stronger verbs and
                    relevant keywords, only where your real experience supports them.
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.3}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">You Approve Every Edit</h3>
                  <p className="text-sm text-muted-foreground">
                    Each suggestion comes with a short reason, and nothing changes until you approve it. We are built
                    not to invent employers, dates, or numbers you never gave us.
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          <FadeIn delay={0.4}>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              asChild
            >
              <Link to="/scanner">Try It With Your Resume</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* 4. WHY US */}
      <section className="w-full py-16 md:py-24 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-10 md:space-y-12">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold">Why use ResumeBuff?</h2>
            <p className="text-primary-foreground/80 mt-4 text-lg">
              Built for candidates who value their time and their privacy.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-8 text-left">
            <FadeIn delay={0.2}>
              <div className="flex gap-4">
                <Zap className="h-8 w-8 flex-shrink-0 text-primary-foreground/80" />
                <div>
                  <h4 className="font-bold text-xl">Fast Turnaround</h4>
                  <p className="text-primary-foreground/70 mt-2">
                    Upload, review the suggested edits, and export a finished one-page PDF in a few minutes, tailored to
                    each job you apply for.
                  </p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.4}>
              <div className="flex gap-4">
                <ShieldCheck className="h-8 w-8 flex-shrink-0 text-primary-foreground/80" />
                <div>
                  <h4 className="font-bold text-xl">Privacy First</h4>
                  <p className="text-primary-foreground/70 mt-2">
                    We don&apos;t keep your resume file or sell your data. Your resume text is sent to an AI provider
                    only to generate your edits.{" "}
                    <Link to="/privacy" className="underline underline-offset-4 hover:text-primary-foreground">
                      Read the details
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.5}>
            <div className="pt-4 md:pt-8 space-y-4">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full h-14 px-8 text-base sm:text-lg text-primary font-bold shadow-xl hover:scale-105 transition-transform"
                asChild
              >
                <Link to="/scanner">Build Your Resume</Link>
              </Button>
              <p className="text-xs text-primary-foreground/60 max-w-md mx-auto">
                ATS software varies from employer to employer, so no tool can guarantee a particular result.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
