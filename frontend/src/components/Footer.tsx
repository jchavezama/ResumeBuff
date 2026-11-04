import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="py-8 max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
        <p>© 2026 ResumeBuff. Built by Jesus Chavez Amaya.</p>
        <div className="flex space-x-6">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <a href="mailto:contact@resumebuff.com" className="hover:text-primary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}