import { AnalyticsService } from '@/services/analytics.service';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    questionAttempt: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    quizSession: {
      create: jest.fn(),
      update: jest.fn(),
    },
    userProgress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    jest.clearAllMocks();
  });

  const mockQuestionAttempt = {
    id: 'attempt-1',
    sessionId: 'session-1',
    questionId: 'question-1',
    isCorrect: true,
    responseTimeMs: 5000,
    attemptedAt: new Date(),
  };

  const mockQuizSession = {
    id: 'session-1',
    userId: 'user-1',
    startedAt: new Date(),
    completedAt: null,
    totalQuestions: 10,
    correctAnswers: 8,
    incorrectAnswers: 2,
  };

  describe('recordQuestionAttempt', () => {
    it('should create a new question attempt', async () => {
      const attemptData = {
        sessionId: 'session-1',
        questionId: 'question-1',
        isCorrect: true,
        responseTimeMs: 5000,
      };

      mockPrisma.questionAttempt.create.mockResolvedValue(mockQuestionAttempt);

      const result = await analyticsService.recordQuestionAttempt(attemptData);

      expect(mockPrisma.questionAttempt.create).toHaveBeenCalledWith({
        data: attemptData
      });
      expect(result).toEqual(mockQuestionAttempt);
    });

    it('should handle Prisma errors', async () => {
      const attemptData = {
        sessionId: 'session-1',
        questionId: 'question-1',
        isCorrect: true,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' }
      );
      mockPrisma.questionAttempt.create.mockRejectedValue(prismaError);

      await expect(analyticsService.recordQuestionAttempt(attemptData))
        .rejects.toThrow('Database error: Foreign key constraint failed');
    });
  });

  describe('createQuizSession', () => {
    it('should create a new quiz session', async () => {
      const sessionData = {
        userId: 'user-1',
        totalQuestions: 10,
        correctAnswers: 8,
        incorrectAnswers: 2,
      };

      mockPrisma.quizSession.create.mockResolvedValue(mockQuizSession);

      const result = await analyticsService.createQuizSession(sessionData);

      expect(mockPrisma.quizSession.create).toHaveBeenCalledWith({
        data: sessionData
      });
      expect(result).toEqual(mockQuizSession);
    });
  });

  describe('updateQuizSession', () => {
    it('should update a quiz session and set completion time', async () => {
      const sessionData = {
        correctAnswers: 9,
        incorrectAnswers: 1,
      };

      const updatedSession = { ...mockQuizSession, ...sessionData, completedAt: new Date() };
      mockPrisma.quizSession.update.mockResolvedValue(updatedSession);

      const result = await analyticsService.updateQuizSession('session-1', sessionData);

      expect(mockPrisma.quizSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          ...sessionData,
          completedAt: expect.any(Date)
        }
      });
      expect(result).toEqual(updatedSession);
    });

    it('should throw error when session not found', async () => {
      const sessionData = { correctAnswers: 9 };
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.quizSession.update.mockRejectedValue(prismaError);

      await expect(analyticsService.updateQuizSession('non-existent', sessionData))
        .rejects.toThrow('Quiz session not found');
    });
  });

  describe('getPerformanceAnalysis', () => {
    it('should return performance analysis for user', async () => {
      const mockAttempts = [
        {
          ...mockQuestionAttempt,
          isCorrect: true,
          responseTimeMs: 5000,
          question: { topic: 'JavaScript' },
          session: { userId: 'user-1' }
        },
        {
          ...mockQuestionAttempt,
          id: 'attempt-2',
          isCorrect: false,
          responseTimeMs: 8000,
          question: { topic: 'JavaScript' },
          session: { userId: 'user-1' }
        }
      ];

      const mockUserProgress = [
        {
          id: 'progress-1',
          userId: 'user-1',
          topic: 'JavaScript',
          masteryLevel: 75.0,
          lastPracticed: new Date(),
          totalAttempts: 10,
          correctAttempts: 7
        }
      ];

      mockPrisma.questionAttempt.findMany.mockResolvedValue(mockAttempts);
      mockPrisma.userProgress.findMany.mockResolvedValue(mockUserProgress);

      const result = await analyticsService.getPerformanceAnalysis('user-1');

      expect(result.overallAccuracy).toBe(50); // 1 correct out of 2 attempts
      expect(result.totalAttempts).toBe(2);
      expect(result.correctAttempts).toBe(1);
      expect(result.averageResponseTime).toBe(6500); // (5000 + 8000) / 2
      expect(result.topicBreakdown).toHaveLength(1);
      expect(result.topicBreakdown[0].topic).toBe('JavaScript');
      expect(result.topicBreakdown[0].accuracy).toBe(50);
      expect(result.topicBreakdown[0].masteryLevel).toBe(75.0);
    });

    it('should return empty analysis when no attempts found', async () => {
      mockPrisma.questionAttempt.findMany.mockResolvedValue([]);

      const result = await analyticsService.getPerformanceAnalysis('user-1');

      expect(result.overallAccuracy).toBe(0);
      expect(result.totalAttempts).toBe(0);
      expect(result.correctAttempts).toBe(0);
      expect(result.topicBreakdown).toEqual([]);
    });

    it('should work without userId (global analysis)', async () => {
      const mockAttempts = [
        {
          ...mockQuestionAttempt,
          question: { topic: 'JavaScript' },
          session: { userId: null }
        }
      ];

      mockPrisma.questionAttempt.findMany.mockResolvedValue(mockAttempts);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);

      const result = await analyticsService.getPerformanceAnalysis();

      expect(mockPrisma.questionAttempt.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          question: true,
          session: true
        }
      });
      expect(result.overallAccuracy).toBe(100); // 1 correct out of 1 attempt
    });
  });

  describe('getUserProgress', () => {
    it('should return user progress ordered by last practiced', async () => {
      const mockProgress = [
        {
          id: 'progress-1',
          userId: 'user-1',
          topic: 'JavaScript',
          masteryLevel: 75.0,
          lastPracticed: new Date(),
          totalAttempts: 10,
          correctAttempts: 7
        }
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);

      const result = await analyticsService.getUserProgress('user-1');

      expect(mockPrisma.userProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastPracticed: 'desc' }
      });
      expect(result).toEqual(mockProgress);
    });
  });

  describe('updateUserProgress', () => {
    it('should update existing user progress', async () => {
      const existingProgress = {
        id: 'progress-1',
        userId: 'user-1',
        topic: 'JavaScript',
        masteryLevel: 70.0,
        lastPracticed: new Date(),
        totalAttempts: 9,
        correctAttempts: 6
      };

      const updatedProgress = {
        ...existingProgress,
        totalAttempts: 10,
        correctAttempts: 7,
        masteryLevel: 75.0
      };

      mockPrisma.userProgress.findUnique.mockResolvedValue(existingProgress);
      mockPrisma.userProgress.update.mockResolvedValue(updatedProgress);

      const result = await analyticsService.updateUserProgress('user-1', 'JavaScript', true);

      expect(mockPrisma.userProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_topic: { userId: 'user-1', topic: 'JavaScript' } }
      });
      expect(mockPrisma.userProgress.update).toHaveBeenCalledWith({
        where: { userId_topic: { userId: 'user-1', topic: 'JavaScript' } },
        data: {
          totalAttempts: 10,
          correctAttempts: 7,
          masteryLevel: expect.any(Number),
          lastPracticed: expect.any(Date)
        }
      });
      expect(result).toEqual(updatedProgress);
    });

    it('should create new user progress when none exists', async () => {
      const newProgress = {
        id: 'progress-1',
        userId: 'user-1',
        topic: 'JavaScript',
        masteryLevel: 70.0,
        lastPracticed: new Date(),
        totalAttempts: 1,
        correctAttempts: 1
      };

      mockPrisma.userProgress.findUnique.mockResolvedValue(null);
      mockPrisma.userProgress.create.mockResolvedValue(newProgress);

      const result = await analyticsService.updateUserProgress('user-1', 'JavaScript', true);

      expect(mockPrisma.userProgress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          topic: 'JavaScript',
          totalAttempts: 1,
          correctAttempts: 1,
          masteryLevel: expect.any(Number),
          lastPracticed: expect.any(Date)
        }
      });
      expect(result).toEqual(newProgress);
    });
  });
});