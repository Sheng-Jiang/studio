import { prisma } from '@/lib/db';
import { QuestionAttempt, QuizSession, UserProgress, Prisma } from '@prisma/client';

export interface QuestionAttemptDto {
  sessionId: string;
  questionId: string;
  isCorrect: boolean;
  responseTimeMs?: number;
}

export interface PerformanceAnalysis {
  overallAccuracy: number;
  totalAttempts: number;
  correctAttempts: number;
  averageResponseTime: number;
  topicBreakdown: TopicPerformance[];
  weakAreas: string[];
  recommendations: string[];
  improvementTrends: TrendData[];
}

export interface TopicPerformance {
  topic: string;
  accuracy: number;
  totalAttempts: number;
  correctAttempts: number;
  averageResponseTime: number;
  masteryLevel: number;
}

export interface TrendData {
  date: string;
  accuracy: number;
  totalAttempts: number;
}

export interface QuizSessionDto {
  userId?: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export class AnalyticsService {
  /**
   * Record a question attempt
   */
  async recordQuestionAttempt(attemptData: QuestionAttemptDto): Promise<QuestionAttempt> {
    try {
      return await prisma.questionAttempt.create({
        data: {
          sessionId: attemptData.sessionId,
          questionId: attemptData.questionId,
          isCorrect: attemptData.isCorrect,
          responseTimeMs: attemptData.responseTimeMs
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to record question attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new quiz session
   */
  async createQuizSession(sessionData: QuizSessionDto): Promise<QuizSession> {
    try {
      return await prisma.quizSession.create({
        data: {
          userId: sessionData.userId,
          totalQuestions: sessionData.totalQuestions,
          correctAnswers: sessionData.correctAnswers,
          incorrectAnswers: sessionData.incorrectAnswers
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to create quiz session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a quiz session
   */
  async updateQuizSession(sessionId: string, sessionData: Partial<QuizSessionDto>): Promise<QuizSession> {
    try {
      return await prisma.quizSession.update({
        where: { id: sessionId },
        data: {
          ...sessionData,
          completedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Quiz session not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to update quiz session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get performance analysis for a user
   */
  async getPerformanceAnalysis(userId?: string): Promise<PerformanceAnalysis> {
    try {
      const whereClause = userId ? { session: { userId } } : {};

      // Get all attempts for the user
      const attempts = await prisma.questionAttempt.findMany({
        where: whereClause,
        include: {
          question: true,
          session: true
        }
      });

      if (attempts.length === 0) {
        return {
          overallAccuracy: 0,
          totalAttempts: 0,
          correctAttempts: 0,
          averageResponseTime: 0,
          topicBreakdown: [],
          weakAreas: [],
          recommendations: [],
          improvementTrends: []
        };
      }

      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter(a => a.isCorrect).length;
      const overallAccuracy = (correctAttempts / totalAttempts) * 100;

      // Calculate average response time
      const responseTimes = attempts.filter(a => a.responseTimeMs !== null).map(a => a.responseTimeMs!);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Group by topic for breakdown
      const topicMap = new Map<string, { correct: number; total: number; responseTimes: number[] }>();
      
      attempts.forEach(attempt => {
        const topic = attempt.question.topic;
        if (!topicMap.has(topic)) {
          topicMap.set(topic, { correct: 0, total: 0, responseTimes: [] });
        }
        const topicData = topicMap.get(topic)!;
        topicData.total++;
        if (attempt.isCorrect) topicData.correct++;
        if (attempt.responseTimeMs) topicData.responseTimes.push(attempt.responseTimeMs);
      });

      // Get user progress for mastery levels
      const userProgress = userId ? await prisma.userProgress.findMany({
        where: { userId }
      }) : [];

      const topicBreakdown: TopicPerformance[] = Array.from(topicMap.entries()).map(([topic, data]) => {
        const progress = userProgress.find(p => p.topic === topic);
        return {
          topic,
          accuracy: (data.correct / data.total) * 100,
          totalAttempts: data.total,
          correctAttempts: data.correct,
          averageResponseTime: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length 
            : 0,
          masteryLevel: progress?.masteryLevel || 0
        };
      });

      // Identify weak areas (topics with < 70% accuracy)
      const weakAreas = topicBreakdown
        .filter(topic => topic.accuracy < 70)
        .map(topic => topic.topic);

      // Generate recommendations
      const recommendations = this.generateRecommendations(topicBreakdown, overallAccuracy);

      // Calculate improvement trends (last 7 days)
      const improvementTrends = await this.calculateImprovementTrends(userId);

      return {
        overallAccuracy,
        totalAttempts,
        correctAttempts,
        averageResponseTime,
        topicBreakdown,
        weakAreas,
        recommendations,
        improvementTrends
      };
    } catch (error) {
      throw new Error(`Failed to get performance analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user progress for all topics
   */
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      return await prisma.userProgress.findMany({
        where: { userId },
        orderBy: { lastPracticed: 'desc' }
      });
    } catch (error) {
      throw new Error(`Failed to get user progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user progress for a topic
   */
  async updateUserProgress(userId: string, topic: string, isCorrect: boolean): Promise<UserProgress> {
    try {
      const existingProgress = await prisma.userProgress.findUnique({
        where: { userId_topic: { userId, topic } }
      });

      if (existingProgress) {
        const newTotalAttempts = existingProgress.totalAttempts + 1;
        const newCorrectAttempts = existingProgress.correctAttempts + (isCorrect ? 1 : 0);
        const newMasteryLevel = this.calculateMasteryLevel(newCorrectAttempts, newTotalAttempts);

        return await prisma.userProgress.update({
          where: { userId_topic: { userId, topic } },
          data: {
            totalAttempts: newTotalAttempts,
            correctAttempts: newCorrectAttempts,
            masteryLevel: newMasteryLevel,
            lastPracticed: new Date()
          }
        });
      } else {
        return await prisma.userProgress.create({
          data: {
            userId,
            topic,
            totalAttempts: 1,
            correctAttempts: isCorrect ? 1 : 0,
            masteryLevel: this.calculateMasteryLevel(isCorrect ? 1 : 0, 1),
            lastPracticed: new Date()
          }
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to update user progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate mastery level based on performance
   */
  private calculateMasteryLevel(correctAttempts: number, totalAttempts: number): number {
    if (totalAttempts === 0) return 0;
    
    const accuracy = correctAttempts / totalAttempts;
    
    // Mastery level calculation with diminishing returns
    let masteryLevel = accuracy * 100;
    
    // Bonus for consistency (more attempts with good accuracy)
    if (totalAttempts >= 5 && accuracy >= 0.8) {
      masteryLevel += Math.min(10, totalAttempts * 0.5);
    }
    
    return Math.min(100, Math.max(0, masteryLevel));
  }

  /**
   * Generate recommendations based on performance
   */
  private generateRecommendations(topicBreakdown: TopicPerformance[], overallAccuracy: number): string[] {
    const recommendations: string[] = [];

    if (overallAccuracy < 60) {
      recommendations.push("Focus on reviewing fundamental concepts before attempting more questions");
    } else if (overallAccuracy < 80) {
      recommendations.push("Good progress! Continue practicing to improve accuracy");
    } else {
      recommendations.push("Excellent performance! Consider tackling more challenging topics");
    }

    // Topic-specific recommendations
    const weakTopics = topicBreakdown.filter(t => t.accuracy < 70);
    if (weakTopics.length > 0) {
      recommendations.push(`Focus on improving: ${weakTopics.map(t => t.topic).join(', ')}`);
    }

    // Response time recommendations
    const slowTopics = topicBreakdown.filter(t => t.averageResponseTime > 10000); // > 10 seconds
    if (slowTopics.length > 0) {
      recommendations.push(`Work on speed for: ${slowTopics.map(t => t.topic).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Calculate improvement trends over time
   */
  private async calculateImprovementTrends(userId?: string): Promise<TrendData[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const whereClause = userId ? { session: { userId } } : {};

      const recentAttempts = await prisma.questionAttempt.findMany({
        where: {
          ...whereClause,
          attemptedAt: {
            gte: sevenDaysAgo
          }
        },
        orderBy: { attemptedAt: 'asc' }
      });

      // Group by date
      const dailyData = new Map<string, { correct: number; total: number }>();
      
      recentAttempts.forEach(attempt => {
        const date = attempt.attemptedAt.toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, { correct: 0, total: 0 });
        }
        const dayData = dailyData.get(date)!;
        dayData.total++;
        if (attempt.isCorrect) dayData.correct++;
      });

      return Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        totalAttempts: data.total
      }));
    } catch (error) {
      console.error('Error calculating improvement trends:', error);
      return [];
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();