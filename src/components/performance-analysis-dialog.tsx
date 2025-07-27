"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, BrainCircuit } from "lucide-react";

interface PerformanceAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  result: string | null;
  onReset: () => void;
}

export function PerformanceAnalysisDialog({
  open,
  onOpenChange,
  isLoading,
  result,
  onReset,
}: PerformanceAnalysisDialogProps) {
  const handleResetAndClose = () => {
    onReset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BrainCircuit className="w-6 h-6 text-primary" />
            Performance Analysis
          </DialogTitle>
          <DialogDescription>
            Here are your weak spots from the last 30 questions. Keep practicing!
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[120px] my-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing your performance...</p>
            </div>
          ) : (
            <div className="p-4 space-y-2 text-sm border rounded-md bg-secondary text-secondary-foreground prose-sm">
              <p>{result || "Could not analyze performance."}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleResetAndClose} className="w-full" variant="default">
            Start New Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
