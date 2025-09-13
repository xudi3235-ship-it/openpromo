import type { Platform } from "@core/schemas/connected-account.sql";
import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useComposerStore } from "@/stores/composer-store";

function AccountIcon({
  platform,
  selected,
}: {
  platform: Platform;
  selected: boolean;
}) {
  const baseClasses =
    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-opacity";
  const opacity = selected ? "opacity-100" : "opacity-40";

  switch (platform) {
    case "FACEBOOK":
      return <div className={`${baseClasses} bg-blue-600 ${opacity}`}>f</div>;
    case "INSTAGRAM":
      return (
        <div
          className={`${baseClasses} bg-gradient-to-br from-purple-500 to-pink-500 ${opacity}`}
        >
          IG
        </div>
      );
    case "TIKTOK":
      return <div className={`${baseClasses} bg-black ${opacity}`}>TT</div>;
  }
}

export function AccountSelection() {
  const { selectedAccounts, accounts } = useComposerStore();

  const allSelected =
    selectedAccounts.length === accounts.length && accounts.length > 0;
  const someSelected = selectedAccounts.length > 0;

  if (!accounts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post to</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No connected accounts. Please connect your social media accounts
            first.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post to</CardTitle>
      </CardHeader>
      <CardContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {selectedAccounts.slice(0, 3).map((accountId, index) => {
                    const account = accounts.find((a) => a.id === accountId);
                    if (!account) return null;
                    return (
                      <div key={accountId} style={{ zIndex: 10 - index }}>
                        <AccountIcon
                          platform={account.platform}
                          selected={true}
                        />
                      </div>
                    );
                  })}
                  {selectedAccounts.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                      +{selectedAccounts.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm">
                  {allSelected
                    ? "All accounts"
                    : someSelected
                      ? `${selectedAccounts.length} accounts`
                      : "No accounts"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="start">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              <Checkbox checked={allSelected} className="mr-2" />
              <span className="font-medium">All accounts</span>
            </DropdownMenuItem>
            {accounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                <Checkbox
                  checked={selectedAccounts.includes(account.id)}
                  className="mr-2"
                />
                <AccountIcon
                  platform={account.platform}
                  selected={selectedAccounts.includes(account.id)}
                />
                <span className="ml-2 text-sm">
                  {account.accountName || account.externalAccountId}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
