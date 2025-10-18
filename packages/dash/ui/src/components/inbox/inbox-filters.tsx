import { Input } from "@openpromo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import type { InboxPlatform } from "@shared/inbox";
import { Search } from "lucide-react";
import type { InboxChannel } from "@/stores/inbox/types";
import { useInboxStore } from "@/stores/inbox-store";

export function InboxFilters() {
  const search = useInboxStore((state) => state.search);
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const setSearch = useInboxStore((state) => state.setSearch);
  const setChannel = useInboxStore((state) => state.setChannel);
  const setPlatform = useInboxStore((state) => state.setPlatform);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search contacts or conversations"
          className="pl-9 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={selectedChannel ?? "__all__"}
          onValueChange={(value) =>
            setChannel(value === "__all__" ? null : (value as InboxChannel))
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All channels</SelectItem>
            <SelectItem value="dm">Direct messages</SelectItem>
            <SelectItem value="post_comment">Post comments</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={selectedPlatform ?? "__all__"}
          onValueChange={(value) =>
            setPlatform(value === "__all__" ? null : (value as InboxPlatform))
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All platforms</SelectItem>
            <SelectItem value="FACEBOOK">Facebook</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="TIKTOK">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
