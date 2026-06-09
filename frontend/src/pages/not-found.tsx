import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="relative mb-8">
        <div className="text-[12rem] font-bold text-muted/20 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <AppLogo size="xl" />
        </div>
      </div>

      <div className="text-center space-y-2 mb-8 relative">
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          The page you are looking for doesn't exist or has been moved.
          Check the URL or return to the dashboard.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/login">
          <Button variant="default" className="gap-2 h-11 px-8">
            <Home size={18} />
            Back to Login
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2 h-11 px-8"
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
      </div>
    </div>
  );
}
