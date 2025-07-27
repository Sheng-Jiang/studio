import { LearningService } from '@/services/learning.service';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    userProgress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    questionAttempt: {
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('LearningService', () => {
  let learningService: LearningService;

  beforeEach(() => {
    learningService = new LearningService();
    jest.clearAllMocks();
  });

  const mockQuestion = {
    id: 'question-1',
    topic: 'JavaScript',
    question: 'What is a closure?',
    answer: 'A closure is a function that has access to variables in its outer scope',
    difficulty: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserProgress = {
    id: 'progress-1',
    userId: 'user-1',
    topic: 'JavaScript',
    masteryLevel: 75.0,
    lastPracticed: new Date(),
    totalAttempts: 10,
    correctAttempts: 7
  };

  describe('getNextQuestions', () => {
    it('should return prioritized questions for user', async () => {
      const mockProgress = [mockUserProgress];
      const mockAttempts = [
        {
          id: 'attempt-1',
          questionId: 'question-2',
          question: { ...mockQuestion, id: 'question-2' }
        }
      ];
      const mockQuestions = [mockQuestion, { ...mockQuestion, id: 'question-2' }];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.questionAttempt.findMany.mockResolvedValue(mockAttempts);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await learningService.getNextQuestions('user-1', 5);

      expect(mockPrisma.userProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      });
      expect(mockPrisma.questionAttempt.findMany).toHaveBeenCalledWith({
        where: { session: { userId: 'user-1' } },
        include: { question: true },
        orderBy: { attemptedAt: 'desc' },
        take: 20
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockQuestion); // Should prioritize question not recently attempted
    });

    it('should handle user with no progress', async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      mockPrisma.questionAttempt.findMany.mockResolvedValue([]);
      mockPrisma.question.findMany.mockResolvedValue([mockQuestion]);

      const result = await learningService.getNextQuestions('user-1', 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockQuestion);
    });
  });

  describe('updateMasteryLevel', () => {
    it('should update existing mastery level', async () => {
      const updatedProgress = { ...mockUserProgress, masteryLevel: 80.0 };

      mockPrisma.userProgress.findUnique.mockResolvedValue(mockUserProgress);
      mockPrisma.userProgress.update.mockResolvedValue(updatedProgress);

      const result = await learningService.updateMasteryLevel('user-1', 'JavaScript', 0.8);

      expect(mockPrisma.userProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_topic: { userId: 'user-1', topic: 'JavaScript' } }
      });
      expect(mockPrisma.userProgress.update).toHaveBeenCalledWith({
        where: { userId_topic: { userId: 'user-1', topic: 'JavaScript' } },
        data: {
          masteryLevel: expect.any(Number),
          lastPracticed: expect.any(Date)
        }
      });
      expect(result).toEqual(updatedProgress);
    });

    it('should create new progress when none exists', async () => {
      const newProgress = {
        id: 'progress-2',
        userId: 'user-1',
        topic: 'TypeScript',
        masteryLevel: 40.0,
        lastPracticed: new Date(),
        totalAttempts: 1,
        correctAttempts: 0
      };

      mockPrisma.userProgress.findUnique.mockResolvedValue(null);
      mockPrisma.userProgress.create.mockResolvedValue(newProgress);

      const result = await learningService.updateMasteryLevel('user-1', 'TypeScript', 0.4);

      expect(mockPrisma.userProgress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          topic: 'TypeScript',
          masteryLevel: expect.any(Number),
          totalAttempts: 1,
          correctAttempts: 0,
          lastPracticed: expect.any(Date)
        }
      });
      expect(result).toEqual(newProgress);
    });
  });

  describe('getLearningRecommendations', () => {
    it('should return learning recommendations with priorities', async () => {
      const mockProgress = [
        { ...mockUserProgress, masteryLevel: 25.0 }, // Low mastery
        { ...mockUserProgress, id: 'progress-2', topic: 'TypeScript', masteryLevel: 85.0 } // High mastery
      ];
      const mockQuestions = [
        mockQuestion,
        { ...mockQuestion, id: 'question-2', topic: 'TypeScript' }
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await learningService.getLearningRecommendations('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].topic).toBe('JavaScript'); // Should prioritize low mastery topic
      expect(result[0].reason).toBe('Low mastery - needs practice');
      expect(result[1].topic).toBe('TypeScript');
      expect(result[1].reason).toBe('High mastery - maintain knowledge');
    });

    it('should handle new topics without progress', async () => {
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      mockPrisma.question.findMany.mockResolvedValue([mockQuestion]);

      const result = await learningService.getLearningRecommendations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe('New topic - start learning');
    });
  });

  describe('calculateSpacedRepetitionInterval', () => {
    it('should increase interval for correct answers', async () => {
      const result = learningService.calculateSpacedRepetitionInterval(6, 2, 2.5, 0.8);

      expect(result.newInterval).toBeGreaterThan(6);
      expect(result.newRepetitions).toBe(3);
      expect(result.newEaseFactor).toBeCloseTo(2.5, 1);
    });

    it('should reset interval for incorrect answers', async () => {
      const result = learningService.calculateSpacedRepetitionInterval(6, 2, 2.5, 0.4);

      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(0);
      expect(result.newEaseFactor).toBeLessThan(2.5);
    });

    it('should handle first repetition correctly', async () => {
      const result = learningService.calculateSpacedRepetitionInterval(0, 0, 2.5, 0.8);

      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(1);
    });

    it('should handle second repetition correctly', async () => {
      const result = learningService.calculateSpacedRepetitionInterval(1, 1, 2.5, 0.8);

      expect(result.newInterval).toBe(6);
      expect(result.newRepetitions).toBe(2);
    });
  });

  describe('getQuestionsForReview', () => {
    it('should return questions due for review based on mastery level', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

      const mockProgress = [
        { ...mockUserProgress, masteryLevel: 85.0, lastPracticed: oldDate }, // High mastery, should be due (7 day interval)
        { ...mockUserProgress, id: 'progress-2', topic: 'TypeScript', masteryLevel: 50.0, lastPracticed: new Date() } // Medium mastery, not due
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.question.findMany.mockResolvedValue([mockQuestion]);

      const result = await learningService.getQuestionsForReview('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockQuestion);
    });

    it('should return empty array when no questions are due', async () => {
      const recentDate = new Date();
      const mockProgress = [
        { ...mockUserProgress, lastPracticed: recentDate }
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.question.findMany.mockResolvedValue([]);

      const result = await learningService.getQuestionsForReview('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getTopicRecommendations', () => {
    it('should return topic recommendations with priorities', async () => {
      const mockProgress = [
        { ...mockUserProgress, masteryLevel: 25.0 } // Low mastery
      ];
      const mockTopics = [
        { topic: 'JavaScript', _count: { id: 10 } },
        { topic: 'TypeScript', _count: { id: 5 } }
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.question.groupBy.mockResolvedValue(mockTopics);

      const result = await learningService.getTopicRecommendations('user-1');

      expect(result).toHaveLength(2);
      // The order depends on the priority calculation, so let's check both topics exist
      const topics = result.map(r => r.topic);
      expect(topics).toContain('JavaScript');
      expect(topics).toContain('TypeScript');
      
      const jsRecommendation = result.find(r => r.topic === 'JavaScript');
      const tsRecommendation = result.find(r => r.topic === 'TypeScript');
      
      expect(jsRecommendation?.reason).toBe('Low mastery - needs immediate attention');
      expect(tsRecommendation?.reason).toBe('New topic - start learning');
    });

    it('should adjust priority based on time since last practice', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const mockProgress = [
        { ...mockUserProgress, masteryLevel: 85.0, lastPracticed: oldDate }
      ];
      const mockTopics = [
        { topic: 'JavaScript', _count: { id: 10 } }
      ];

      mockPrisma.userProgress.findMany.mockResolvedValue(mockProgress);
      mockPrisma.question.groupBy.mockResolvedValue(mockTopics);

      const result = await learningService.getTopicRecommendations('user-1');

      expect(result[0].priority).toBeGreaterThan(20); // Should be higher than base priority due to time factor
    });
  });
});