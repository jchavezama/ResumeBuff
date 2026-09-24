import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, FileSearch, Sparkles, Target, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// Helper component for fading in sections as you scroll down
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
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
      <section className="relative w-full py-32 px-4 flex flex-col items-center text-center">
        {/* Abstract background blur for a "slick" modern feel */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <FadeIn>
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8">
            <Sparkles className="mr-2 h-4 w-4" /> Waitlist open for advanced ATS tracking
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto text-foreground">
            Stop getting rejected by <br className="hidden md:block" />
            <span className="text-primary">machines.</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ResumeBuff reverse-engineers corporate Applicant Tracking Systems. We analyze your PDF exactly like their AI does, so you can fix the flaws before you apply.
          </p>
          <div className="flex justify-center gap-4 mt-10">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/25 transition-all" asChild>
              <Link to="/scanner">Scan Your Resume <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="w-full py-24 px-4 bg-muted/50 border-y border-border/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">The hiring system is broken.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Over 75% of resumes are discarded automatically. You aren't getting rejected because you lack the skills; you are getting rejected because a robotic parser couldn't read your multi-column layout or missed a specific semantic keyword.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                If the bot can't parse your impact, the hiring manager will never see your name.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <Bot className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-xl font-bold">The AI Rejector</h3>
                <p className="text-sm text-muted-foreground">
                  Scans for exact keywords, strips out formatting, and immediately archives resumes that fall below a 70% match threshold.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </section>

      {/* 3. OUR FIX */}
      <section className="w-full py-32 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-16">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-bold">Our Solution: The Pre-Screen.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
              We provide a strict ATS sandbox. Drop your resume and the job description in, and we will show you exactly what the recruiter's screen will look like.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 w-full">
            <FadeIn delay={0.1}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <FileSearch className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">Layout Extraction</h3>
                  <p className="text-sm text-muted-foreground">We rip the text from your PDF using the same libraries Workday and Greenhouse use, flagging invisible formatting errors.</p>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.2}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <Target className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">Keyword Matching</h3>
                  <p className="text-sm text-muted-foreground">We cross-reference your experience against the job description, explicitly highlighting missing critical skills.</p>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.3}>
              <Card className="h-full border-primary/20 hover:border-primary/50 transition-colors bg-background shadow-sm hover:shadow-md">
                <CardContent className="p-6 space-y-4 text-left">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <h3 className="font-bold text-lg">AI Rewrites</h3>
                  <p className="text-sm text-muted-foreground">We take weak, passive bullet points and automatically rewrite them with strong action verbs and quantifiable metrics.</p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          <FadeIn delay={0.4}>
            <Button variant="outline" size="lg" className="rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
              <Link to="/scanner">Test Your Resume Now</Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* 4. WHY US */}
      <section className="w-full py-24 px-4 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold">Why use ResumeBuff?</h2>
            <p className="text-primary-foreground/80 mt-4 text-lg">Designed for candidates who value their privacy and their time.</p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-8 text-left">
            <FadeIn delay={0.2}>
              <div className="flex gap-4">
                <Zap className="h-8 w-8 flex-shrink-0 text-primary-foreground/80" />
                <div>
                  <h4 className="font-bold text-xl">Instant Feedback</h4>
                  <p className="text-primary-foreground/70 mt-2">Get comprehensive, actionable feedback in under 10 seconds. Fix your resume and apply immediately.</p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.4}>
              <div className="flex gap-4">
                <ShieldCheck className="h-8 w-8 flex-shrink-0 text-primary-foreground/80" />
                <div>
                  <h4 className="font-bold text-xl">Total Privacy</h4>
                  <p className="text-primary-foreground/70 mt-2">Your data is yours. We use enterprise API endpoints, meaning your employment history is never used to train public AI models.</p>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.5}>
            <div className="pt-8">
              <Button size="lg" variant="secondary" className="rounded-full h-14 px-8 text-lg text-primary font-bold shadow-xl hover:scale-105 transition-transform" asChild>
                <Link to="/scanner">Bypass the Filters Today</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
  );
}