import React from "react";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { User, Mail, Shield, Calendar, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Tables<"profiles"> | null;

  const fullName = profile?.full_name || user.user_metadata?.full_name || "User";
  const email = profile?.email || user.email || "";
  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          User Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal details, credentials, and security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <Card className="md:col-span-1 shadow-sm">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4 shadow-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{email}</p>

            <div className="w-full border-t my-4" />

            <div className="w-full space-y-2 text-left text-xs">
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Account Security
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Protected (RLS)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Member Since
                </span>
                <span className="font-medium text-foreground">
                  {createdAt}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your basic identity details associated with this account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    defaultValue={fullName}
                    className="pl-9"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    defaultValue={email}
                    className="pl-9"
                    readOnly
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Email verification is managed securely by Supabase Auth.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId">Internal User UUID</Label>
                <Input
                  id="userId"
                  defaultValue={user.id}
                  className="font-mono text-xs bg-muted/40"
                  readOnly
                />
                <p className="text-[11px] text-muted-foreground">
                  Used by PostgreSQL Row Level Security to isolate all tenant rows.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Password & Security
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password or request a reset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <a href="/forgot-password">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Request Password Reset Link
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
