import { useAuth } from "@/lib/auth-context";
import { signInWithEmail, signInWithGoogle, signOut } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, isAdmin, loading, setLocation]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err?.message ?? "Sign in failed.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border/50 relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 text-xl font-serif">
            SR
          </div>
          <CardTitle className="text-2xl font-serif">Soul Remembrance</CardTitle>
          <CardDescription className="text-base mt-2">Admin Control Panel</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {user && !isAdmin ? (
            <div className="space-y-4">
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                Access denied. {user.email} does not have admin privileges.
              </div>
              <Button variant="outline" onClick={signOut} className="w-full">
                Sign out and try another account
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isSigningIn}>
                  {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign in
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in with Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground z-10">
        Authorized personnel only.
      </p>
    </div>
  );
}
