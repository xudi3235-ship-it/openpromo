import { Button } from "@openpromo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { Textarea } from "@openpromo/ui/components/textarea";
import { ChevronDown } from "lucide-react";
import type { Control, FieldValues } from "react-hook-form";

interface ProductDetailsSectionProps {
  control: Control<FieldValues>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsSection({
  control,
  isOpen,
  onOpenChange,
}: ProductDetailsSectionProps) {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onOpenChange}
      className="space-y-3"
    >
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Product Details
          </h3>
          <p className="text-xs text-muted-foreground">
            Optional - Add name, description, and more
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0" type="button">
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
            <span className="sr-only">Toggle product details</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-3">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter product description"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Electronics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="tag1, tag2, tag3" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Comma-separated</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
