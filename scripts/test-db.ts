#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Count records in each table
    const questionCount = await prisma.question.count();
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.quizSession.count();
    const attemptCount = await prisma.questionAttempt.count();
    const progressCount = await prisma.userProgress.count();
    
    console.log('\n📊 Database Statistics:');
    console.log(`Questions: ${questionCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Quiz Sessions: ${sessionCount}`);
    console.log(`Question Attempts: ${attemptCount}`);
    console.log(`User Progress Records: ${progressCount}`);
    
    // Test a simple query
    const sampleQuestions = await prisma.question.findMany({
      take: 2,
      select: {
        id: true,
        topic: true,
        question: true,
        difficulty: true,
      },
    });
    
    console.log('\n📝 Sample Questions:');
    sampleQuestions.forEach((q, index) => {
      console.log(`${index + 1}. [${q.difficulty}] ${q.topic}: ${q.question.substring(0, 50)}...`);
    });
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();