import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const addQuestionSchema = z.object({
  topic: z.string(),
  question: z.string(),
  answer: z.string(),
});

// This is a simplified approach for demonstration. In a real-world application,
// you would use a database to store questions.
const questionsFilePath = path.join(process.cwd(), 'src', 'lib', 'questions.ts');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newQuestionData = addQuestionSchema.parse(body);

    // Read the existing questions file
    const fileContent = await fs.readFile(questionsFilePath, 'utf-8');

    // This is a very brittle way to update the file, but it avoids needing to parse/re-generate the AST.
    // It finds the closing bracket of the `questions` array and inserts the new question before it.
    const newQuestionString = `  {
    id: 'q${Date.now()}',
    topic: '${newQuestionData.topic.replace(/'/g, "\\'")}',
    question: '${newQuestionData.question.replace(/'/g, "\\'")}',
    answer: '${newQuestionData.answer.replace(/'/g, "\\'")}',
  },
];`;

    const updatedFileContent = fileContent.replace(/];\s*$/, newQuestionString);

    await fs.writeFile(questionsFilePath, updatedFileContent, 'utf-8');

    return NextResponse.json({ message: 'Question added successfully' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
