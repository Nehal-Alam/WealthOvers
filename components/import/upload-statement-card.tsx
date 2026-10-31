"use client";

import * as React from "react";
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadAndParseStatementAction,
  ParseStatementResponse,
} from "@/app/(dashboard)/import/actions";

interface UploadStatementCardProps {
  accounts: Tables<"accounts">[];
  onParsed: (result: ParseStatementResponse, targetAccountId: string) => void;
}

export function UploadStatementCard({ accounts, onParsed }: UploadStatementCardProps) {
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(accounts[0]?.id || "");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a statement file");
      return;
    }
    if (!selectedAccountId) {
      toast.error("Please select an account for this statement");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("accountId", selectedAccountId);

    try {
      const res = await uploadAndParseStatementAction(formData);
      if (res.success && res.data) {
        toast.success(res.message);
        onParsed(res.data, selectedAccountId);
      } else {
        toast.error(res.error || "Failed to parse statement");
      }
    } catch {
      toast.error("An error occurred during file upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-indigo-500" />
          Upload Bank Statement
        </CardTitle>
        <CardDescription>
          Supports CSV, Excel (.xlsx, .xls), and PDF statements from HDFC, SBI, ICICI, Axis, and all major financial institutions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="account">Target Account</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.institution_name || acc.account_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls, .pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {selectedFile.name.endsWith(".pdf") ? (
                  <FileText className="h-6 w-6 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                )}
              </div>
              <p className="font-semibold text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to change file
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-sm">Click to choose a file or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CSV, XLSX, XLS, or PDF bank statements (Max 10 MB)
                </p>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full gap-2"
        >
          {isUploading ? "Extracting & Normalizing..." : "Parse & Preview Transactions"}
        </Button>
      </CardContent>
    </Card>
  );
}

