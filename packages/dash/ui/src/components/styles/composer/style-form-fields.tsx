import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import { useStyleComposerStore } from "@/stores/style-composer-store";

export function StyleFormFields() {
  const name = useStyleComposerStore((state) => state.name);
  const description = useStyleComposerStore((state) => state.description);
  const imageGenPrompt = useStyleComposerStore((state) => state.imageGenPrompt);

  const setName = useStyleComposerStore((state) => state.setName);
  const setDescription = useStyleComposerStore((state) => state.setDescription);
  const setImageGenPrompt = useStyleComposerStore(
    (state) => state.setImageGenPrompt,
  );

  return (
    <>
      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name">Style Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Minimalist Modern, Vintage Retro..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-base"
          autoFocus
        />
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the visual style and aesthetic..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px] resize-none text-base"
        />
      </div>

      {/* Image Generation Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Image Generation Prompt *</Label>
        <Textarea
          id="prompt"
          placeholder="e.g., minimalist modern aesthetic, clean white background, soft lighting..."
          value={imageGenPrompt}
          onChange={(e) => setImageGenPrompt(e.target.value)}
          className="min-h-[80px] resize-none text-base"
        />
      </div>
    </>
  );
}
