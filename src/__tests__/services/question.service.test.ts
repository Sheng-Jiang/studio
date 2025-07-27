import { QuestionService } from '@/services/question.service';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('QuestionService', () => {
  let questionService: QuestionService;

  beforeEach(() => {
    questionService = new QuestionService();
    jest.clearAllMocks();
  });

  const mockQuestion = {
    id: 'test-id',
    topic: 'JavaScript',
    question: 'What is a closure?',
    answer: 'A closure is a function that has access to variables in its outer scope',
    difficulty: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getAllQuestions', () => {
    it('should return all questions ordered by creation date', async () => {
      const mockQuestions = [mockQuestion];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await questionService.getAllQuestions();

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockQuestions);
    });

    it('should throw error when database operation fails', async () => {
      mockPrisma.question.findMany.mockRejectedValue(new Error('Database error'));

      await expect(questionService.getAllQuestions()).rejects.toThrow('Failed to fetch questions: Database error');
    });
  });

  describe('getQuestionById', () => {
    it('should return question by id', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await questionService.getQuestionById('test-id');

      expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
      expect(result).toEqual(mockQuestion);
    });

    it('should return null when question not found', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);

      const result = await questionService.getQuestionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getQuestionsByTopic', () => {
    it('should return questions filtered by topic', async () => {
      const mockQuestions = [mockQuestion];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await questionService.getQuestionsByTopic('JavaScript');

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: { topic: 'JavaScript' },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockQuestions);
    });
  });

  describe('addQuestion', () => {
    it('should create a new question with default difficulty', async () => {
      const questionData = {
        topic: 'JavaScript',
        question: 'What is a closure?',
        answer: 'A closure is a function that has access to variables in its outer scope'
      };

      mockPrisma.question.create.mockResolvedValue(mockQuestion);

      const result = await questionService.addQuestion(questionData);

      expect(mockPrisma.question.create).toHaveBeenCalledWith({
        data: {
          ...questionData,
          difficulty: 'medium'
        }
      });
      expect(result).toEqual(mockQuestion);
    });

    it('should create a new question with specified difficulty', async () => {
      const questionData = {
        topic: 'JavaScript',
        question: 'What is a closure?',
        answer: 'A closure is a function that has access to variables in its outer scope',
        difficulty: 'hard' as const
      };

      mockPrisma.question.create.mockResolvedValue({ ...mockQuestion, difficulty: 'hard' });

      const result = await questionService.addQuestion(questionData);

      expect(mockPrisma.question.create).toHaveBeenCalledWith({
        data: questionData
      });
    });

    it('should handle Prisma errors', async () => {
      const questionData = {
        topic: 'JavaScript',
        question: 'What is a closure?',
        answer: 'A closure is a function that has access to variables in its outer scope'
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Database error',
        { code: 'P2002', clientVersion: '5.0.0' }
      );
      mockPrisma.question.create.mockRejectedValue(prismaError);

      await expect(questionService.addQuestion(questionData)).rejects.toThrow('Database error: Database error');
    });
  });

  describe('updateQuestion', () => {
    it('should update an existing question', async () => {
      const updateData = { topic: 'TypeScript' };
      const updatedQuestion = { ...mockQuestion, topic: 'TypeScript' };

      mockPrisma.question.update.mockResolvedValue(updatedQuestion);

      const result = await questionService.updateQuestion('test-id', updateData);

      expect(mockPrisma.question.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: updateData
      });
      expect(result).toEqual(updatedQuestion);
    });

    it('should throw error when question not found', async () => {
      const updateData = { topic: 'TypeScript' };
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.question.update.mockRejectedValue(prismaError);

      await expect(questionService.updateQuestion('non-existent', updateData))
        .rejects.toThrow('Question not found');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question', async () => {
      mockPrisma.question.delete.mockResolvedValue(mockQuestion);

      await questionService.deleteQuestion('test-id');

      expect(mockPrisma.question.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('should throw error when question not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.question.delete.mockRejectedValue(prismaError);

      await expect(questionService.deleteQuestion('non-existent'))
        .rejects.toThrow('Question not found');
    });
  });

  describe('getRandomQuestions', () => {
    it('should return random questions', async () => {
      const mockQuestions = [mockQuestion, { ...mockQuestion, id: 'test-id-2' }];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      // Mock Math.random to ensure deterministic results
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      const result = await questionService.getRandomQuestions(1);

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: {}
      });
      expect(result).toHaveLength(1);

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should filter by topic when provided', async () => {
      const mockQuestions = [mockQuestion];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      await questionService.getRandomQuestions(5, 'JavaScript');

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: { topic: 'JavaScript' }
      });
    });
  });

  describe('getQuestionCountByTopic', () => {
    it('should return question count grouped by topic', async () => {
      const mockGroupByResult = [
        { topic: 'JavaScript', _count: { id: 5 } },
        { topic: 'TypeScript', _count: { id: 3 } }
      ];

      mockPrisma.question.groupBy.mockResolvedValue(mockGroupByResult);

      const result = await questionService.getQuestionCountByTopic();

      expect(mockPrisma.question.groupBy).toHaveBeenCalledWith({
        by: ['topic'],
        _count: { id: true }
      });
      expect(result).toEqual({
        'JavaScript': 5,
        'TypeScript': 3
      });
    });
  });
});