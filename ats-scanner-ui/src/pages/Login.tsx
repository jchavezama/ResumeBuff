import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { account, ID } from "../appwrite";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        // 1. Create the new user account
        await account.create(ID.unique(), email, password, name);
        // 2. Automatically log them in right after signing up
        await account.createEmailPasswordSession(email, password);
      } else {
        // Just log in an existing user
        await account.createEmailPasswordSession(email, password);
      }

      // 3. Redirect them to the tool upon success
      navigate("/scanner");
    } catch (error: any) {
      console.error("Authentication failed:", error);
      setErrorMsg(error.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isSignUp ? "Create an account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up to build your ATS-friendly resume."
              : "Enter your email to sign in to your account."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-md"
              >
                {errorMsg}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {isSignUp && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button className="w-full h-11" type="submit" disabled={isLoading}>
              {isLoading ? "Authenticating..." : isSignUp ? "Sign Up" : "Log In"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              {isSignUp ? "Already have an account? Log in." : "Don't have an account? Sign up."}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
