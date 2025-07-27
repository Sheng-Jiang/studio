import { 
  prisma, 
  checkDatabaseConnection, 
  testDatabaseConnection,
  disconnectDatabase,
  withTransaction,
  handleDatabaseError,
  seedDatabase,
  cleanupDatabase,
  getConnectionInfo
} from '@/lib/db';
import { Prisma } from '@prisma/client';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected before running tests
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Could not connect to test database');
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();
  });

  afterAll(async () => {
    // Clean up and disconnect after all tests
    await cleanupDatabase();
    await disconnectDatabase();
  });

  describe('Database Connection', () => {
    it('should successfully connect to database', async () => {
      const healthStatus = await checkDatabaseConnection();
      
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.latency).toBeGreaterThan(0);
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.error).toBeUndefined();
    });

    it('should test connection with retry mechanism', async () => {
      const isConnected = await testDatabaseConnection(1);
      expect(isConnected).toBe(true);
    });

    it('should return connection info', () => {
      const info = getConnectionInfo();
      
      expect(info.provider).toBe('sqlite');
      expect(info.connected).toBe(true);
      expect(info.url).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should create and retrieve a question', async () => {
      const questionData = {
        topic: 'JavaScript',
        question: 'What is a closure?',
        answer: 'A closure is a function that has access to variables in its outer scope',
        difficulty: 'medium'
      };

      const createdQuestion = await prisma.question.create({
        data: questionData
      });

      expect(createdQuestion.id).toBeDefined();
      expect(createdQuestion.topic).toBe(questionData.topic);
      expect(createdQuestion.question).toBe(questionData.question);
      expect(createdQuestion.answer).toBe(questionData.answer);
      expect(createdQuestion.difficulty).toBe(questionData.difficulty);

      const retrievedQuestion = await prisma.question.findUnique({
        where: { id: createdQuestion.id }
      });

      expect(retrievedQuestion).toEqual(createdQuestion);
    });

    it('should create user with progress tracking', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const user = await prisma.user.create({
        data: userData
      });

      const progressData = {
        userId: user.id,
        topic: 'JavaScript',
        masteryLevel: 75.0,
        totalAttempts: 10,
        correctAttempts: 7
      };

      const progress = await prisma.userProgress.create({
        data: progressData
      });

      expect(progress.userId).toBe(user.id);
      expect(progress.topic).toBe(progressData.topic);
      expect(progress.masteryLevel).toBe(progressData.masteryLevel);
    });

    it('should create quiz session with attempts', async () => {
      // Create user and question first
      const user = await prisma.user.create({
        data: { name: 'Test User', email: 'test@example.com' }
      });

      const question = await prisma.question.create({
        data: {
          topic: 'JavaScript',
          question: 'What is a closure?',
          answer: 'A closure is a function that has access to variables in its outer scope',
          difficulty: 'medium'
        }
      });

      // Create quiz session
      const session = await prisma.quizSession.create({
        data: {
          userId: user.id,
          totalQuestions: 1,
          correctAnswers: 1,
          incorrectAnswers: 0
        }
      });

      // Create question attempt
      const attempt = await prisma.questionAttempt.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          isCorrect: true,
          responseTimeMs: 5000
        }
      });

      expect(attempt.sessionId).toBe(session.id);
      expect(attempt.questionId).toBe(question.id);
      expect(attempt.isCorrect).toBe(true);
      expect(attempt.responseTimeMs).toBe(5000);

      // Verify relationships
      const sessionWithAttempts = await prisma.quizSession.findUnique({
        where: { id: session.id },
        include: { attempts: true, user: true }
      });

      expect(sessionWithAttempts?.attempts).toHaveLength(1);
      expect(sessionWithAttempts?.user?.id).toBe(user.id);
    });
  });

  describe('Database Transactions', () => {
    it('should successfully execute transaction', async () => {
      const result = await withTransaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: 'Transaction User', email: 'transaction@example.com' }
        });

        const question = await tx.question.create({
          data: {
            topic: 'JavaScript',
            question: 'What is a closure?',
            answer: 'A closure is a function that has access to variables in its outer scope',
            difficulty: 'medium'
          }
        });

        return { user, question };
      });

      expect(result.user.id).toBeDefined();
      expect(result.question.id).toBeDefined();

      // Verify data was committed
      const userExists = await prisma.user.findUnique({
        where: { id: result.user.id }
      });
      expect(userExists).toBeTruthy();
    });

    it('should rollback transaction on error', async () => {
      try {
        await withTransaction(async (tx) => {
          await tx.user.create({
            data: { name: 'Transaction User', email: 'transaction@example.com' }
          });

          // This should cause the transaction to fail
          throw new Error('Intentional error');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Verify no data was committed
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unique constraint violation', async () => {
      // Create user with email
      await prisma.user.create({
        data: { name: 'User 1', email: 'duplicate@example.com' }
      });

      try {
        // Try to create another user with same email
        await prisma.user.create({
          data: { name: 'User 2', email: 'duplicate@example.com' }
        });
      } catch (error) {
        const dbError = handleDatabaseError(error);
        expect(dbError.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
        expect(dbError.message).toContain('already exists');
      }
    });

    it('should handle record not found error', async () => {
      try {
        await prisma.user.update({
          where: { id: 'non-existent-id' },
          data: { name: 'Updated Name' }
        });
      } catch (error) {
        const dbError = handleDatabaseError(error);
        expect(dbError.code).toBe('RECORD_NOT_FOUND');
        expect(dbError.message).toContain('not found');
      }
    });

    it('should handle foreign key constraint violation', async () => {
      try {
        // Try to create quiz session with non-existent user
        await prisma.quizSession.create({
          data: {
            userId: 'non-existent-user',
            totalQuestions: 1,
            correctAnswers: 0,
            incorrectAnswers: 1
          }
        });
      } catch (error) {
        const dbError = handleDatabaseError(error);
        expect(dbError.code).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
        expect(dbError.message).toContain('foreign key constraint');
      }
    });

    it('should handle validation errors', async () => {
      try {
        // Try to create question with invalid data type
        await (prisma.question as any).create({
          data: {
            topic: 123, // Should be string
            question: 'What is a closure?',
            answer: 'A closure is a function that has access to variables in its outer scope',
            difficulty: 'medium'
          }
        });
      } catch (error) {
        const dbError = handleDatabaseError(error);
        expect(dbError.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error message');
      const dbError = handleDatabaseError(genericError);
      
      expect(dbError.code).toBe('GENERIC_ERROR');
      expect(dbError.message).toBe('Generic error message');
      expect(dbError.details).toBeDefined();
    });

    it('should handle unknown errors', async () => {
      const unknownError = 'Unknown error';
      const dbError = handleDatabaseError(unknownError);
      
      expect(dbError.code).toBe('UNKNOWN_ERROR');
      expect(dbError.message).toBe('An unknown error occurred');
      expect(dbError.details).toBe(unknownError);
    });
  });

  describe('Database Seeding', () => {
    it('should seed database with sample data', async () => {
      const result = await seedDatabase();
      expect(result).toBe(true);

      const questions = await prisma.question.findMany();
      expect(questions.length).toBeGreaterThan(0);

      // Verify sample questions were created
      const jsQuestion = questions.find(q => q.topic === 'JavaScript');
      expect(jsQuestion).toBeDefined();
      expect(jsQuestion?.question).toContain('closure');
    });

    it('should not seed database if data already exists', async () => {
      // Create a question first
      await prisma.question.create({
        data: {
          topic: 'Test',
          question: 'Test question?',
          answer: 'Test answer',
          difficulty: 'easy'
        }
      });

      const result = await seedDatabase();
      expect(result).toBe(true);

      const questions = await prisma.question.findMany();
      expect(questions).toHaveLength(1); // Should not add more questions
    });
  });

  describe('Database Cleanup', () => {
    it('should clean up all data in correct order', async () => {
      // Create test data with relationships
      const user = await prisma.user.create({
        data: { name: 'Test User', email: 'test@example.com' }
      });

      const question = await prisma.question.create({
        data: {
          topic: 'JavaScript',
          question: 'What is a closure?',
          answer: 'A closure is a function that has access to variables in its outer scope',
          difficulty: 'medium'
        }
      });

      const session = await prisma.quizSession.create({
        data: {
          userId: user.id,
          totalQuestions: 1,
          correctAnswers: 1,
          incorrectAnswers: 0
        }
      });

      await prisma.questionAttempt.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          isCorrect: true,
          responseTimeMs: 5000
        }
      });

      await prisma.userProgress.create({
        data: {
          userId: user.id,
          topic: 'JavaScript',
          masteryLevel: 75.0,
          totalAttempts: 1,
          correctAttempts: 1
        }
      });

      // Clean up
      await cleanupDatabase();

      // Verify all data is deleted
      const users = await prisma.user.findMany();
      const questions = await prisma.question.findMany();
      const sessions = await prisma.quizSession.findMany();
      const attempts = await prisma.questionAttempt.findMany();
      const progress = await prisma.userProgress.findMany();

      expect(users).toHaveLength(0);
      expect(questions).toHaveLength(0);
      expect(sessions).toHaveLength(0);
      expect(attempts).toHaveLength(0);
      expect(progress).toHaveLength(0);
    });
  });
});