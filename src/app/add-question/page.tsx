"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  topic: z.string().min(2, {
    message: "Topic must be at least 2 characters.",
  }),
  question: z.string().min(10, {
    message: "Question must be at least 10 characters.",
  }),
  answer: z.string().min(1, {
    message: "Answer cannot be empty.",
  }),
});

export default function AddQuestionPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      question: "",
      answer: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const response = await fetch('/api/add-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      toast({
        title: "Question Added",
        description: "Your new question has been saved.",
      });
      router.push("/");
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not save the question. Please try again.",
      });
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-8 md:p-12">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Flashcards
        </Link>
        <h1 className="text-4xl font-bold text-primary font-headline mb-6">Add a New Question</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Biology" {...field} />
                  </FormControl>
                  <FormDescription>
                    The subject or category of the question.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., What is the powerhouse of the cell?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The question you want to ask.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mitochondria" {...field} />
                  </FormControl>
                  <FormDescription>
                    The correct answer to the question.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Add Question</Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
