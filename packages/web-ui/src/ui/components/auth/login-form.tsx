import { GalleryVerticalEnd } from "lucide-react";
import { useState } from "react";
import { useSendPinMutation, useVerifyPinMutation } from "@/lib/auth";
import { cn } from "@/ui/lib/utils";
import { Button } from "../button";
import { Input } from "../input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../input-otp";
import { Label } from "../label";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  const sendPinMutation = useSendPinMutation();
  const verifyPinMutation = useVerifyPinMutation();

  const handleSendPin = async (e: React.FormEvent) => {
    e.preventDefault();

    sendPinMutation.mutate(email, {
      onSuccess: () => {
        setStep("code");
      },
    });
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    verifyPinMutation.mutate({ email, code });
  };

  const resetForm = () => {
    setStep("email");
    setCode("");
    sendPinMutation.reset();
    verifyPinMutation.reset();
  };

  // Derive loading and error states from mutations
  const isLoading = sendPinMutation.isPending || verifyPinMutation.isPending;
  const error =
    sendPinMutation.error?.message || verifyPinMutation.error?.message;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={step === "email" ? handleSendPin : handleVerifyPin}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Openpromo Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to Openpromo Inc.</h1>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="underline underline-offset-4">
                Sign up
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            {step === "email" ? (
              <EmailStep
                email={email}
                setEmail={setEmail}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <OTPStep
                email={email}
                code={code}
                setCode={setCode}
                isLoading={isLoading}
                error={error}
                onBack={resetForm}
              />
            )}
          </div>
          {step === "email" && (
            <>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-background text-muted-foreground relative z-10 px-2">
                  Or
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button variant="outline" type="button" className="w-full">
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: todo */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Apple
                </Button>
                <Button variant="outline" type="button" className="w-full">
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: todo */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our{" "}
        <a href="/terms">Terms of Service</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </div>
    </div>
  );
}

// Email Step Component
interface EmailStepProps {
  email: string;
  setEmail: (email: string) => void;
  isLoading: boolean;
  error: string | undefined;
}

function EmailStep({ email, setEmail, isLoading, error }: EmailStepProps) {
  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Enter your email</h2>
        <p className="text-sm text-muted-foreground">
          We'll send you a verification code to sign in
        </p>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !email}>
        {isLoading ? "Sending..." : "Send verification code"}
      </Button>
    </>
  );
}

// OTP Step Component
interface OTPStepProps {
  email: string;
  code: string;
  setCode: (code: string) => void;
  isLoading: boolean;
  error: string | undefined;
  onBack: () => void;
}

function OTPStep({
  email,
  code,
  setCode,
  isLoading,
  error,
  onBack,
}: OTPStepProps) {
  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Enter verification code</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium">{email}</span>
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Wrong email? Change it
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || code.length !== 6}
      >
        {isLoading ? "Verifying..." : "Verify and sign in"}
      </Button>
    </>
  );
}
