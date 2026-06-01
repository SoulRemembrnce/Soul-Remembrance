import { useAuth } from "@/lib/auth-context";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, isAdmin, loading, setLocation]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in error:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
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
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-xl border-border/50 relative z-10">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 text-xl font-serif">
            SR
          </div>
          <CardTitle className="text-2xl font-serif">Soul Remembrance</CardTitle>
          <CardDescription className="text-base mt-2">
            Admin Control Panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex flex-col items-center">
          {user && !isAdmin ? (
            <div className="text-center w-full space-y-4">
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                Access Denied. Your email ({user.email}) does not have admin privileges.
              </div>
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                Sign out
              </Button>
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full text-base" 
              onClick={handleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign in with Google
            </Button>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-xs text-muted-foreground z-10">
        Authorized personnel only.
      </div>
    </div>
  );
}
