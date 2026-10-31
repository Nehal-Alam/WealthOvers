import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center shadow-lg border-muted">
        <CardHeader className="pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
            <FileQuestion className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Page Not Found</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            The page or financial resource you are looking for does not exist, has been moved, or is restricted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="javascript:history.back()" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
