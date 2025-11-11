import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { CTA_OPTIONS, type CTAType } from "../../types/platform-features";

interface CTADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: CTAType;
  initialLink?: string;
  onSave: (type: CTAType, link: string) => void;
  onRemove?: () => void;
}

export function CTADialog({
  open,
  onOpenChange,
  initialType = "LEARN_MORE",
  initialLink = "",
  onSave,
  onRemove,
}: CTADialogProps) {
  const [type, setType] = useState<CTAType>(initialType);
  const [link, setLink] = useState(initialLink);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (open) {
      setType(initialType);
      setLink(initialLink);
      setLinkError("");
    }
  }, [open, initialType, initialLink]);

  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    // If it already has a protocol, return as is
    if (trimmed.match(/^https?:\/\//i)) {
      return trimmed;
    }

    // Add https:// if missing
    return `https://${trimmed}`;
  };

  const validateUrl = (url: string): string => {
    if (!url.trim()) {
      return "Link is required";
    }

    const normalized = normalizeUrl(url);

    try {
      const urlObj = new URL(normalized);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return "Link must start with http:// or https://";
      }
      return "";
    } catch {
      return "Please enter a valid domain (e.g., example.com)";
    }
  };

  const handleLinkChange = (value: string) => {
    setLink(value);
    if (value.trim()) {
      const error = validateUrl(value);
      setLinkError(error);
    } else {
      setLinkError("");
    }
  };

  const handleSave = () => {
    const error = validateUrl(link);
    if (!error) {
      const normalizedLink = normalizeUrl(link);
      onSave(type, normalizedLink);
      onOpenChange(false);
    } else {
      setLinkError(error);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
      onOpenChange(false);
    }
  };

  const selectedOption = CTA_OPTIONS.find((opt) => opt.value === type);
  const canSave = link.trim() && !linkError;

  const facebookMeta = getPlatformMeta("FACEBOOK");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <facebookMeta.icon
              className={`h-5 w-5 ${facebookMeta.accentTextClass}`}
            />
            <DialogTitle>Call-to-Action Button</DialogTitle>
          </div>
          <DialogDescription>
            Add a button to your Facebook post to drive customer actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CTA Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="cta-type">Button Type</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as CTAType)}
            >
              <SelectTrigger id="cta-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CTA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Link Input */}
          <div className="space-y-2">
            <Label htmlFor="cta-link">Destination Link</Label>
            <div className="relative">
              <Input
                id="cta-link"
                type="text"
                placeholder="example.com"
                value={link}
                onChange={(e) => handleLinkChange(e.target.value)}
                className={linkError ? "border-destructive" : ""}
              />
              <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {linkError && (
              <p className="text-xs text-destructive">{linkError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Just enter the domain (https:// will be added automatically)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onRemove && (
            <Button
              variant="outline"
              onClick={handleRemove}
              className="mr-auto text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
