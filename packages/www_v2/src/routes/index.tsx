import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import Navbar from "@openpromo/ui/components/navbar";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalendarIcon,
  ImageIcon,
  TrendingUpIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="px-4 py-20 md:px-6 lg:py-32">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Unified Content Creation & Management
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Manage your content across Facebook, Instagram, and TikTok from
                one powerful platform. Schedule, draft, and publish with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/auth/login">
                    Get Started
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 md:px-6 bg-muted/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need for content management
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Streamline your workflow with our comprehensive suite of tools
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Smart Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Schedule your content across multiple platforms with
                    intelligent timing optimization.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Multi-Platform Publishing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Publish to Facebook, Instagram, and TikTok simultaneously
                    with platform-specific optimizations.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5" />
                    Analytics & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track performance across platforms and get actionable
                    insights to improve your content strategy.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 md:px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Ready to streamline your content workflow?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of content creators who trust OpenPromo for their
              multi-platform strategy.
            </p>
            <Button size="lg" asChild>
              <Link to="/workspace">
                Start Your Workspace
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
