import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@openpromo/ui/components/sidebar";
import useDialogState from "@openpromo/ui/hooks/use-dialog-state";
import { cn } from "@openpromo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/context/theme-provider";
import { useWorkspaceSlug } from "@/hooks/useWorkspace";
import type { User } from "@/lib/hono-client";
import { SignOutDialog } from "../signout-dialog";

type NavUserProps = {
  user: User;
};

export function NavUser({ user }: NavUserProps) {
  const workspaceSlug = useWorkspaceSlug();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useDialogState();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user.profilePictureUrl ?? ""}
                    alt={user.lastName ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">SN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
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
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link
                    to="/workspaces/$workspaceSlug/billing"
                    params={{ workspaceSlug }}
                  >
                    <CreditCard />
                    Billing
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun />
                  Light
                  <Check
                    size={14}
                    className={cn("ms-auto", theme !== "light" && "hidden")}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon />
                  Dark
                  <Check
                    size={14}
                    className={cn("ms-auto", theme !== "dark" && "hidden")}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Sun className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  System
                  <Check
                    size={14}
                    className={cn("ms-auto", theme !== "system" && "hidden")}
                  />
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
