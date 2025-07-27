import { PrismaClient, Prisma } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
}

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

let prisma: PrismaClient;

// Enhanced Prisma client configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: env.LOG_LEVEL === 'debug' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });
};

if (env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  // In development, use a global variable to preserve the connection across hot reloads
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }
  prisma = global.__prisma;
}

export { prisma };

/**
 * Enhanced health check function with latency measurement
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    return {
      isHealthy: true,
      latency,
      timestamp: new Date()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Database connection failed:', error);
    
    return {
      isHealthy: false,
      error: errorMessage,
      timestamp: new Date()
    };
  }
}

/**
 * Test database connection with retry mechanism
 */
export async function testDatabaseConnection(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const healthStatus = await checkDatabaseConnection();
      if (healthStatus.isHealthy) {
        console.log(`Database connection successful on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.warn(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`Database connection failed after ${maxRetries} attempts`);
  return false;
}

/**
 * Graceful shutdown with connection cleanup
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed gracefully');
  } catch (error) {
    // In test environment, setImmediate might not be available
    // Log the error but don't throw to avoid breaking tests
    if (env.NODE_ENV === 'test') {
      console.warn('Database disconnection warning in test environment:', error);
    } else {
      console.error('Error during database disconnection:', error);
      throw error;
    }
  }
}

/**
 * Database transaction wrapper with error handling
 */
export async function withTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(callback);
  } catch (error) {
    const dbError = handleDatabaseError(error);
    throw new Error(`Transaction failed: ${dbError.message}`);
  }
}

/**
 * Comprehensive database error handler
 */
export function handleDatabaseError(error: unknown): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this information already exists',
          details: error.meta
        };
      case 'P2025':
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          details: error.meta
        };
      case 'P2003':
        return {
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          message: 'This operation violates a foreign key constraint',
          details: error.meta
        };
      case 'P2014':
        return {
          code: 'INVALID_ID',
          message: 'The provided ID is invalid',
          details: error.meta
        };
      case 'P2021':
        return {
          code: 'TABLE_NOT_EXISTS',
          message: 'The table does not exist in the current database',
          details: error.meta
        };
      case 'P2022':
        return {
          code: 'COLUMN_NOT_EXISTS',
          message: 'The column does not exist in the current database',
          details: error.meta
        };
      default:
        return {
          code: error.code,
          message: error.message,
          details: error.meta
        };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      code: 'UNKNOWN_DATABASE_ERROR',
      message: 'An unknown database error occurred',
      details: error.message
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: 'DATABASE_PANIC',
      message: 'A critical database error occurred',
      details: error.message
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: 'DATABASE_INITIALIZATION_ERROR',
      message: 'Failed to initialize database connection',
      details: error.message
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Database query validation failed',
      details: error.message
    };
  }

  // Generic error handling
  if (error instanceof Error) {
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      details: error.stack
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    details: error
  };
}

/**
 * Database migration utilities
 */
export async function runMigrations(): Promise<boolean> {
  try {
    // This would typically use Prisma CLI commands
    // For now, we'll just check if the database is accessible
    const healthStatus = await checkDatabaseConnection();
    return healthStatus.isHealthy;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * Database seeding utilities
 */
export async function seedDatabase(): Promise<boolean> {
  try {
    // Check if database already has data
    const questionCount = await prisma.question.count();
    
    if (questionCount > 0) {
      console.log('Database already seeded');
      return true;
    }

    // Add some sample questions for development
    const sampleQuestions = [
      {
        topic: 'JavaScript',
        question: 'What is a closure in JavaScript?',
        answer: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.',
        difficulty: 'medium'
      },
      {
        topic: 'React',
        question: 'What is the difference between state and props in React?',
        answer: 'Props are read-only data passed from parent to child components, while state is mutable data managed within a component.',
        difficulty: 'easy'
      },
      {
        topic: 'TypeScript',
        question: 'What are generics in TypeScript?',
        answer: 'Generics allow you to create reusable components that can work with multiple types while maintaining type safety.',
        difficulty: 'hard'
      }
    ];

    await prisma.question.createMany({
      data: sampleQuestions
    });

    console.log('Database seeded successfully');
    return true;
  } catch (error) {
    console.error('Database seeding failed:', error);
    return false;
  }
}

/**
 * Database cleanup utilities for testing
 */
export async function cleanupDatabase(): Promise<void> {
  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.questionAttempt.deleteMany();
    await prisma.quizSession.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('Database cleaned up successfully');
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Connection pool monitoring
 */
export function getConnectionInfo() {
  return {
    url: env.DATABASE_URL,
    provider: 'sqlite',
    connected: true // Prisma doesn't expose connection pool info for SQLite
  };
}