import { Link } from "@tanstack/react-router";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { Button } from "./button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";
import SuperiorLogo from "./superior-logo";

export default function LandingNavbar() {
  return (
    <nav className="w-full px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-10 items-center justify-between">
          {/* Logo */}
          <SuperiorLogo />

          {/* Navigation Links - Hidden on mobile */}
          <NavigationMenu className="hidden md:flex" viewport={false}>
            <NavigationMenuList className="gap-6">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent px-0 text-[15px] font-medium text-[var(--neutral-900)] hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent">
                  Pages
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-48 p-2">
                    <p className="text-sm text-muted-foreground">
                      Pages content coming soon...
                    </p>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  variant="ghost"
                  className="px-0 text-[15px] font-medium text-[var(--neutral-900)] hover:bg-transparent"
                >
                  About
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  variant="ghost"
                  className="px-0 text-[15px] font-medium text-[var(--neutral-900)] hover:bg-transparent"
                  asChild
                >
                  <Link to="/pricing">Pricing</Link>
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  variant="ghost"
                  className="px-0 text-[15px] font-medium text-[var(--neutral-900)] hover:bg-transparent"
                >
                  Integrations
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  variant="ghost"
                  className="px-0 text-[15px] font-medium text-[var(--neutral-900)] hover:bg-transparent"
                >
                  Blog
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side - Dark mode toggle and Book demo */}
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center rounded-full border border-[var(--neutral-200)] p-1">
              <Button
                variant="mode-active"
                size="mode-icon"
                className="flex items-center justify-center"
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button
                variant="mode-inactive"
                size="mode-icon"
                className="flex items-center justify-center"
              >
                <Moon className="w-4 h-4" />
              </Button>
            </div>

            {/* Book a demo button */}
            <Button variant="secondary" size="xl">
              Book a demo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
