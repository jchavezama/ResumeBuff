import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { account } from "../appwrite";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ran = useRef(false); // secret is single-use; prevents StrictMode double-run

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const userId = params.get("userId");
    const secret = params.get("secret");

    if (!userId || !secret) {
      navigate("/login", { replace: true });
      return;
    }

    account
      .createSession(userId, secret)
      .then(() => navigate("/scanner", { replace: true }))
      .catch((err) => {
        console.error("OAuth session error:", err);
        navigate("/login", { replace: true });
      });
  }, [params, navigate]);

  return (
    <div className="flex-grow flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}