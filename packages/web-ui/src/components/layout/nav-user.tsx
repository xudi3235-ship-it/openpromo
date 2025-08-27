import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";
import useDialogState from "@/components/hooks/use-dialog-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/hono-client";
import { SignOutDialog } from "../signout-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type NavUserProps = {
  user: User;
};

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const [open, setOpen] = useDialogState();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all duration-200 rounded-xl p-3"
              >
                <Avatar className="h-9 w-9 rounded-xl ring-2 ring-sidebar-border">
                  <AvatarImage
                    src={user.profilePictureUrl ?? ""}
                    alt={user.lastName ?? ""}
                  />
                  <AvatarFallback className="rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                    {user.firstName?.charAt(0) ?? ""}
                    {user.lastName?.charAt(0) ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold text-[var(--neutral-900)]">
                    {user.firstName ?? ""} {user.lastName ?? ""}
                  </span>
                  <span className="truncate text-xs text-[var(--neutral-600)]">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user.profilePictureUrl ?? ""}
                      alt={user.lastName ?? ""}
                    />
                    <AvatarFallback className="rounded-lg">SN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.firstName ?? ""} {user.lastName ?? ""}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <BadgeCheck />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <CreditCard />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <Bell />
                    Notifications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  );
}
