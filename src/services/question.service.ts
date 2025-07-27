import { prisma } from '@/lib/db';
import { Question, Prisma } from '@prisma/client';

export interface CreateQuestionDto {
  topic: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface UpdateQuestionDto {
  topic?: string;
  question?: string;
  answer?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export class QuestionService {
  /**
   * Get all questions from the database
   */
  async getAllQuestions(): Promise<Question[]> {
    try {
      return await prisma.question.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      throw new Error(`Failed to fetch questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a question by ID
   */
  async getQuestionById(id: string): Promise<Question | null> {
    try {
      return await prisma.question.findUnique({
        where: { id }
      });
    } catch (error) {
      throw new Error(`Failed to fetch question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get questions by topic
   */
  async getQuestionsByTopic(topic: string): Promise<Question[]> {
    try {
      return await prisma.question.findMany({
        where: { topic },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      throw new Error(`Failed to fetch questions by topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get questions by difficulty
   */
  async getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
    try {
      return await prisma.question.findMany({
        where: { difficulty },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      throw new Error(`Failed to fetch questions by difficulty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a new question to the database
   */
  async addQuestion(questionData: CreateQuestionDto): Promise<Question> {
    try {
      return await prisma.question.create({
        data: {
          topic: questionData.topic,
          question: questionData.question,
          answer: questionData.answer,
          difficulty: questionData.difficulty || 'medium'
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to create question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing question
   */
  async updateQuestion(id: string, questionData: UpdateQuestionDto): Promise<Question> {
    try {
      return await prisma.question.update({
        where: { id },
        data: questionData
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Question not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a question by ID
   */
  async deleteQuestion(id: string): Promise<void> {
    try {
      await prisma.question.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Question not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to delete question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get random questions for quiz
   */
  async getRandomQuestions(count: number, topic?: string): Promise<Question[]> {
    try {
      const whereClause = topic ? { topic } : {};
      
      // SQLite doesn't have RANDOM() function, so we'll get all questions and shuffle
      const questions = await prisma.question.findMany({
        where: whereClause
      });

      // Shuffle array and return requested count
      const shuffled = questions.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      throw new Error(`Failed to fetch random questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get question count by topic
   */
  async getQuestionCountByTopic(): Promise<Record<string, number>> {
    try {
      const result = await prisma.question.groupBy({
        by: ['topic'],
        _count: {
          id: true
        }
      });

      return result.reduce((acc, item) => {
        acc[item.topic] = item._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      throw new Error(`Failed to get question count by topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const questionService = new QuestionService();