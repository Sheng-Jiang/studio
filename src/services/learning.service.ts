import { prisma } from '@/lib/db';
import { Question, UserProgress, Prisma } from '@prisma/client';

export interface SpacedRepetitionData {
  questionId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

export interface LearningRecommendation {
  questionId: string;
  priority: number;
  reason: string;
  topic: string;
}

export class LearningService {
  /**
   * Get next questions for a user based on spaced repetition algorithm
   */
  async getNextQuestions(userId: string, count: number = 10): Promise<Question[]> {
    try {
      // Get user progress to understand mastery levels
      const userProgress = await prisma.userProgress.findMany({
        where: { userId }
      });

      // Get recent attempts to avoid immediate repetition
      const recentAttempts = await prisma.questionAttempt.findMany({
        where: {
          session: { userId }
        },
        include: { question: true },
        orderBy: { attemptedAt: 'desc' },
        take: 20 // Last 20 attempts
      });

      const recentQuestionIds = new Set(recentAttempts.map(a => a.questionId));

      // Get all questions
      const allQuestions = await prisma.question.findMany();

      // Calculate priority for each question
      const questionPriorities = allQuestions.map(question => {
        const progress = userProgress.find(p => p.topic === question.topic);
        const priority = this.calculateQuestionPriority(question, progress, recentQuestionIds.has(question.id));
        
        return {
          question,
          priority,
          masteryLevel: progress?.masteryLevel || 0
        };
      });

      // Sort by priority (higher priority first) and mastery level (lower mastery first)
      questionPriorities.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.masteryLevel - b.masteryLevel;
      });

      // Return top questions
      return questionPriorities.slice(0, count).map(qp => qp.question);
    } catch (error) {
      throw new Error(`Failed to get next questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update mastery level for a user and topic based on performance
   */
  async updateMasteryLevel(userId: string, topic: string, performance: number): Promise<UserProgress> {
    try {
      const existingProgress = await prisma.userProgress.findUnique({
        where: { userId_topic: { userId, topic } }
      });

      const newMasteryLevel = this.calculateNewMasteryLevel(
        existingProgress?.masteryLevel || 0,
        performance,
        existingProgress?.totalAttempts || 0
      );

      if (existingProgress) {
        return await prisma.userProgress.update({
          where: { userId_topic: { userId, topic } },
          data: {
            masteryLevel: newMasteryLevel,
            lastPracticed: new Date()
          }
        });
      } else {
        return await prisma.userProgress.create({
          data: {
            userId,
            topic,
            masteryLevel: newMasteryLevel,
            totalAttempts: 1,
            correctAttempts: performance > 0.5 ? 1 : 0,
            lastPracticed: new Date()
          }
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error(`Failed to update mastery level: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get learning recommendations for a user
   */
  async getLearningRecommendations(userId: string): Promise<LearningRecommendation[]> {
    try {
      const userProgress = await prisma.userProgress.findMany({
        where: { userId }
      });

      const allQuestions = await prisma.question.findMany();

      const recommendations: LearningRecommendation[] = [];

      allQuestions.forEach(question => {
        const progress = userProgress.find(p => p.topic === question.topic);
        const priority = this.calculateQuestionPriority(question, progress, false);
        
        let reason = '';
        if (!progress) {
          reason = 'New topic - start learning';
        } else if (progress.masteryLevel < 30) {
          reason = 'Low mastery - needs practice';
        } else if (progress.masteryLevel < 70) {
          reason = 'Moderate mastery - continue practicing';
        } else {
          reason = 'High mastery - maintain knowledge';
        }

        recommendations.push({
          questionId: question.id,
          priority,
          reason,
          topic: question.topic
        });
      });

      // Sort by priority
      recommendations.sort((a, b) => b.priority - a.priority);

      return recommendations.slice(0, 20); // Return top 20 recommendations
    } catch (error) {
      throw new Error(`Failed to get learning recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate spaced repetition interval based on performance
   */
  calculateSpacedRepetitionInterval(
    currentInterval: number,
    repetitions: number,
    easeFactor: number,
    performance: number
  ): { newInterval: number; newEaseFactor: number; newRepetitions: number } {
    let newEaseFactor = easeFactor;
    let newRepetitions = repetitions;
    let newInterval = currentInterval;

    if (performance >= 0.6) {
      // Correct answer
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentInterval * easeFactor);
      }
      newRepetitions = repetitions + 1;
    } else {
      // Incorrect answer
      newRepetitions = 0;
      newInterval = 1;
    }

    // Update ease factor based on performance
    newEaseFactor = Math.max(1.3, easeFactor + (0.1 - (5 - performance * 5) * (0.08 + (5 - performance * 5) * 0.02)));

    return {
      newInterval,
      newEaseFactor,
      newRepetitions
    };
  }

  /**
   * Get questions that are due for review based on spaced repetition
   */
  async getQuestionsForReview(userId: string): Promise<Question[]> {
    try {
      // This would typically use a separate table for spaced repetition data
      // For now, we'll use the user progress and last practiced date
      const userProgress = await prisma.userProgress.findMany({
        where: { userId }
      });

      const questionsForReview: string[] = [];

      for (const progress of userProgress) {
        const daysSinceLastPractice = Math.floor(
          (Date.now() - progress.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Simple spaced repetition logic based on mastery level
        let reviewInterval = 1; // Default: review daily
        if (progress.masteryLevel >= 80) {
          reviewInterval = 7; // Weekly for high mastery
        } else if (progress.masteryLevel >= 60) {
          reviewInterval = 3; // Every 3 days for moderate mastery
        }

        if (daysSinceLastPractice >= reviewInterval) {
          // Get questions for this topic
          const topicQuestions = await prisma.question.findMany({
            where: { topic: progress.topic },
            select: { id: true }
          });
          questionsForReview.push(...topicQuestions.map(q => q.id));
        }
      }

      // Get the actual question objects
      return await prisma.question.findMany({
        where: {
          id: { in: questionsForReview }
        }
      });
    } catch (error) {
      throw new Error(`Failed to get questions for review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate question priority based on various factors
   */
  private calculateQuestionPriority(
    question: Question,
    progress: UserProgress | undefined,
    wasRecentlyAttempted: boolean
  ): number {
    let priority = 50; // Base priority

    // Factor 1: Mastery level (lower mastery = higher priority)
    if (progress) {
      priority += (100 - progress.masteryLevel) * 0.5;
    } else {
      priority += 25; // New topics get moderate priority
    }

    // Factor 2: Time since last practice
    if (progress) {
      const daysSinceLastPractice = Math.floor(
        (Date.now() - progress.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
      );
      priority += Math.min(daysSinceLastPractice * 2, 20);
    }

    // Factor 3: Difficulty level
    switch (question.difficulty) {
      case 'easy':
        priority += 5;
        break;
      case 'medium':
        priority += 10;
        break;
      case 'hard':
        priority += 15;
        break;
    }

    // Factor 4: Recent attempts (reduce priority if recently attempted)
    if (wasRecentlyAttempted) {
      priority -= 30;
    }

    // Factor 5: Success rate (if available)
    if (progress && progress.totalAttempts > 0) {
      const successRate = progress.correctAttempts / progress.totalAttempts;
      if (successRate < 0.5) {
        priority += 20; // High priority for low success rate
      } else if (successRate > 0.8) {
        priority -= 10; // Lower priority for high success rate
      }
    }

    return Math.max(0, Math.min(100, priority));
  }

  /**
   * Calculate new mastery level based on current level and performance
   */
  private calculateNewMasteryLevel(
    currentMastery: number,
    performance: number,
    totalAttempts: number
  ): number {
    // Performance should be between 0 and 1
    const normalizedPerformance = Math.max(0, Math.min(1, performance));
    
    // Learning rate decreases as mastery increases (diminishing returns)
    const learningRate = 0.1 * (1 - currentMastery / 100);
    
    // Calculate change in mastery
    let masteryChange = 0;
    if (normalizedPerformance > 0.5) {
      // Correct answer - increase mastery
      masteryChange = learningRate * (normalizedPerformance - 0.5) * 100;
    } else {
      // Incorrect answer - decrease mastery
      masteryChange = -learningRate * (0.5 - normalizedPerformance) * 50;
    }

    // Apply stability factor based on number of attempts
    const stabilityFactor = Math.min(1, totalAttempts / 10);
    masteryChange *= (1 + stabilityFactor);

    const newMastery = currentMastery + masteryChange;
    
    // Ensure mastery stays within bounds
    return Math.max(0, Math.min(100, newMastery));
  }

  /**
   * Get topic recommendations based on user progress
   */
  async getTopicRecommendations(userId: string): Promise<{ topic: string; reason: string; priority: number }[]> {
    try {
      const userProgress = await prisma.userProgress.findMany({
        where: { userId }
      });

      // Get all topics from questions
      const allTopics = await prisma.question.groupBy({
        by: ['topic'],
        _count: { id: true }
      });

      const recommendations = allTopics.map(topicData => {
        const progress = userProgress.find(p => p.topic === topicData.topic);
        
        let priority = 50;
        let reason = '';

        if (!progress) {
          priority = 80;
          reason = 'New topic - start learning';
        } else if (progress.masteryLevel < 30) {
          priority = 90;
          reason = 'Low mastery - needs immediate attention';
        } else if (progress.masteryLevel < 60) {
          priority = 70;
          reason = 'Moderate mastery - continue practicing';
        } else if (progress.masteryLevel < 80) {
          priority = 40;
          reason = 'Good mastery - occasional review';
        } else {
          priority = 20;
          reason = 'High mastery - maintenance only';
        }

        // Adjust priority based on time since last practice
        if (progress) {
          const daysSinceLastPractice = Math.floor(
            (Date.now() - progress.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
          );
          priority += Math.min(daysSinceLastPractice * 2, 20);
        }

        return {
          topic: topicData.topic,
          reason,
          priority: Math.min(100, priority)
        };
      });

      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      throw new Error(`Failed to get topic recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();