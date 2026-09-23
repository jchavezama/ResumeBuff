import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { account } from "../appwrite";
import { Button } from "@/components/ui/button";
import { User, Sun, Moon } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Initialize theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // 2. Toggle theme function
  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // 3. Check session on route change
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentAccount = await account.get();
        setUser(currentAccount);
      } catch (error) {
        setUser(null); 
      }
    };
    checkSession();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="ResumeBuff Logo" className="h-8 w-auto rounded-sm object-contain" />
            <span className="font-bold text-xl tracking-tight">ResumeBuff</span>
        </Link>

        {/* Shadcn Navigation Menu */}
        <div className="hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/">How it Works</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/scanner">The Tool</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/privacy">Privacy</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Auth, Theme Toggle, & CTA */}
        <div className="flex items-center space-x-4">
          
          {/* Theme Toggle Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            className="rounded-full text-muted-foreground hover:text-primary"
            title="Toggle theme"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user ? (
            /* Logged In State */
            <button 
              onClick={handleLogout}
              title={`Logged in as ${user.name}. Click to log out.`}
              className="h-10 w-10 rounded-full bg-primary flex items-center justify-center hover:ring-2 hover:ring-primary/50 hover:scale-105 transition-all cursor-pointer shadow-sm"
            >
              <User className="h-5 w-5 text-primary-foreground" />
            </button>
          ) : (
            /* Logged Out State */
            <Button variant="ghost" asChild>
              <Link to="/login">Log In / Sign Up</Link>
            </Button>
          )}

          <Button asChild>
            <Link to="/scanner">Try for Free</Link>
          </Button>

        </div>
        
      </div>
    </nav>
  );
}