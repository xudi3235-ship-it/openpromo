import { Button } from "@openpromo/ui/components/button";
import { Link2, Plus } from "lucide-react";

interface ComposerNullStateProps {
  onConnectAccount: () => void;
}

export function ComposerNullState({
  onConnectAccount,
}: ComposerNullStateProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        <div className="w-full flex items-center justify-center p-8">
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-3">
              Connect your accounts to get started
            </h2>

            <p className="text-muted-foreground mb-6 leading-relaxed">
              To start creating and scheduling content, you'll need to connect
              at least one social media account. Connect your Facebook,
              Instagram, or TikTok accounts to begin.
            </p>

            <Button onClick={onConnectAccount} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Connect Your First Account
            </Button>

            <div className="mt-8 text-sm text-muted-foreground">
              <p>Supported platforms:</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-sm text-xs">
                  Facebook
                </span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-sm text-xs">
                  Instagram
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-sm text-xs">
                  TikTok
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
