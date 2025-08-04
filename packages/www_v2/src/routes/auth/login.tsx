import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { Separator } from "@openpromo/ui/components/separator";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GithubIcon, MailIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement email login logic
    console.log("Email login:", { email });
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    // TODO: Implement GitHub OAuth login
    console.log("GitHub login");
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">


        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue to OpenPromo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GitHub Login Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGithubLogin}
              disabled={isLoading}
            >
              <GithubIcon className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                <MailIcon className="mr-2 h-4 w-4" />
                {isLoading ? "Signing in..." : "Sign in with Email"}
              </Button>
            </form>

  

          </CardContent>
        </Card>

        {/* Terms and Privacy */}
        <div className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
} 