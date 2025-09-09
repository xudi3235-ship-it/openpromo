import { Button } from "@openpromo/ui/components/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@openpromo/ui/components/navigation-menu";
import { ChevronRight } from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-white" />
      </div>
      <span className="text-lg font-semibold text-neutral-900">Openpromo</span>
    </div>
  );
}

export default function LandingNavbar() {
  return (
    <nav className="w-full px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-10 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <Logo />
          </a>

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
                  <a href="/pricing">Pricing</a>
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

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Book a demo button */}
            <Button variant="outline" size="xl">
              Book a demo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
