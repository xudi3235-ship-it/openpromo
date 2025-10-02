import { Button } from "@openpromo/ui/components/button";
import { useRouter } from "@tanstack/react-router";

interface UnauthorizedErrorProps {
  login: () => void;
}

export default function UnauthorizedError({ login }: UnauthorizedErrorProps) {
  const { history } = useRouter();

  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">401</h1>
        <span className="font-medium">Unauthorized Access</span>
        <p className="text-muted-foreground text-center">
          Please log in with the appropriate credentials <br /> to access this
          resource.
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => history.go(-1)}>
            Go Back
          </Button>
          <Button onClick={login}>Log In</Button>
        </div>
      </div>
    </div>
  );
}
