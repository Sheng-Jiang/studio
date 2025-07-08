"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface FlashCardProps {
  question: string;
  answer: string;
  isFlipped: boolean;
  topic: string;
}

export function FlashCard({ question, answer, isFlipped, topic }: FlashCardProps) {
  return (
    <div className="w-full max-w-2xl h-80 [perspective:1000px]">
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
          { "[transform:rotateY(180deg)]": isFlipped }
        )}
      >
        {/* Front of the card (Question) */}
        <Card className="absolute w-full h-full [backface-visibility:hidden] flex flex-col justify-between p-6 shadow-lg">
          <div className="self-start px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground">{topic}</div>
          <CardContent className="flex items-center justify-center flex-grow p-0">
            <p className="text-2xl font-semibold text-center text-card-foreground">{question}</p>
          </CardContent>
          <div className="h-6"></div>
        </Card>

        {/* Back of the card (Answer) */}
        <Card className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between p-6 bg-secondary shadow-lg">
           <div className="self-start px-3 py-1 text-sm rounded-full bg-background text-foreground">{topic}</div>
          <CardContent className="flex items-center justify-center flex-grow p-0">
            <p className="text-3xl font-bold text-center text-primary">{answer}</p>

          </CardContent>
          <div className="h-6"></div>
        </Card>
      </div>
    </div>
  );
}
