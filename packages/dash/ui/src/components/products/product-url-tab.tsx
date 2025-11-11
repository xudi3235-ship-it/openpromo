import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { TabsContent } from "@openpromo/ui/components/tabs";
import type { Control, FieldValues } from "react-hook-form";

interface ProductUrlTabProps {
  control: Control<FieldValues>;
}

export function ProductUrlTab({ control }: ProductUrlTabProps) {
  return (
    <TabsContent value="url" className="space-y-3 mt-4">
      <FormField
        control={control}
        name="sourceUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product URL</FormLabel>
            <FormControl>
              <Input
                placeholder="https://amazon.com/product/... or any product page"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Paste any product URL (Amazon, Shopify, Etsy, or your own site).
              We'll automatically extract product info and images.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </TabsContent>
  );
}
