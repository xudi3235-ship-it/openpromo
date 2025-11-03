import { Button } from "@openpromo/ui/components/button";
import { Spinner } from "@openpromo/ui/components/spinner";
import { RiAiGenerate } from "react-icons/ri";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

export function GenerateButton({
  onClick,
  disabled,
  isGenerating,
}: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full"
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
