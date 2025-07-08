"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { analyzePerformance, AnalyzePerformanceOutput } from "@/ai/flows/analyze-performance";
import { questions, Question } from "@/lib/questions";
import { FlashCard } from "@/components/flash-card";
import { PerformanceAnalysisDialog } from "@/components/performance-analysis-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Check, X, RefreshCw, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ANALYSIS_THRESHOLD = 50;

export default function Home() {
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionAnsweredCount, setSessionAnsweredCount] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [incorrectAnswers, setIncorrectAnswers] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePerformanceOutput | null>(null);
  const [isClient, setIsClient] = useState(false);

  const { toast } = useToast();

  const resetSession = useCallback(() => {
    setShuffledIndices(
      [...Array(questions.length).keys()].sort(() => Math.random() - 0.5)
    );
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionAnsweredCount(0);
    setCorrectAnswers([]);
    setIncorrectAnswers([]);
    setShowAnalysis(false);
    setIsLoadingAnalysis(false);
    setAnalysisResult(null);
  }, []);

  useEffect(() => {
    setIsClient(true);
    resetSession();
  }, [resetSession]);

  const currentQuestion: Question | undefined = useMemo(() => {
    if (shuffledIndices.length > 0) {
      return questions[shuffledIndices[currentIndex]];
    }
    return undefined;
  }, [shuffledIndices, currentIndex]);

  const handleNextQuestion = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShuffledIndices(
          [...Array(questions.length).keys()].sort(() => Math.random() - 0.5)
        );
        setCurrentIndex(0);
      }
    }, 250);
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentQuestion) return;

    const updatedCorrect = isCorrect ? [...correctAnswers, currentQuestion.id] : correctAnswers;
    const updatedIncorrect = !isCorrect ? [...incorrectAnswers, currentQuestion.id] : incorrectAnswers;

    setCorrectAnswers(updatedCorrect);
    setIncorrectAnswers(updatedIncorrect);

    const newAnsweredCount = sessionAnsweredCount + 1;
    setSessionAnsweredCount(newAnsweredCount);

    if (newAnsweredCount >= ANALYSIS_THRESHOLD) {
      setIsLoadingAnalysis(true);
      setShowAnalysis(true);
      try {
        const result = await analyzePerformance({
          correctAnswers: updatedCorrect,
          incorrectAnswers: updatedIncorrect,
          totalQuestions: ANALYSIS_THRESHOLD,
        });
        setAnalysisResult(result);
      } catch (error) {
        console.error("Analysis failed:", error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "There was an error analyzing your performance.",
        });
        setAnalysisResult({ weakAreas: 'We encountered an error during analysis.' });
      } finally {
        setIsLoadingAnalysis(false);
      }
    } else {
      handleNextQuestion();
    }
  };

  if (!isClient || !currentQuestion) {
    return (
      <main className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-8 md:p-12">
        <header className="flex items-center justify-between w-full max-w-2xl mb-6">
          <Skeleton className="w-48 h-10" />
          <Skeleton className="w-32 h-9" />
        </header>
        <div className="w-full max-w-2xl mb-6">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-48 h-5 mx-auto mt-2" />
        </div>
        <Skeleton className="w-full h-80 max-w-2xl" />
        <div className="flex items-center justify-center gap-4 mt-8">
          <Skeleton className="w-56 h-12" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-8 md:p-12">
        <header className="flex items-center justify-between w-full max-w-2xl mb-6">
          <h1 className="text-4xl font-bold text-primary font-headline">FlashTest</h1>
          <Button variant="outline" size="sm" onClick={resetSession}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </header>

        <div className="w-full max-w-2xl mb-6">
          <Progress value={(sessionAnsweredCount / ANALYSIS_THRESHOLD) * 100} className="w-full h-3 transition-all duration-300" />
          <p className="mt-2 text-sm text-center text-muted-foreground">
            {sessionAnsweredCount} / {ANALYSIS_THRESHOLD} questions for analysis
          </p>
        </div>

        <FlashCard
          question={currentQuestion.question}
          answer={currentQuestion.answer}
          topic={currentQuestion.topic}
          isFlipped={isFlipped}
        />

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 h-12">
          {!isFlipped ? (
            <Button size="lg" onClick={() => setIsFlipped(true)}>
              Flip to see Answer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleAnswer(false)}
              >
                <X className="w-5 h-5 mr-2" />
                Incorrect
              </Button>
              <Button
                size="lg"
                variant="default"
                onClick={() => handleAnswer(true)}
              >
                <Check className="w-5 h-5 mr-2" />
                Correct
              </Button>
            </>
          )}
        </div>
      </main>

      <PerformanceAnalysisDialog
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
        isLoading={isLoadingAnalysis}
        result={analysisResult?.weakAreas ?? null}
        onReset={resetSession}
      />
    </>
  );
}
