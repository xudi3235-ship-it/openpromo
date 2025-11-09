import { Button } from "@openpromo/ui/components/button";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import { RiAiGenerate } from "react-icons/ri";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  className?: string;
}

export function GenerateButton({
  onClick,
  disabled,
  isGenerating,
  className,
}: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn("w-full sm:w-auto", className)}
      size="default"
    >
      {isGenerating ? (
        <>
          <Spinner className="mr-2 h-3.5 w-3.5" />
          Generating...
        </>
      ) : (
        <>
          <RiAiGenerate className="mr-2 h-3.5 w-3.5" />
          Generate Image
        </>
      )}
    </Button>
  );
}
