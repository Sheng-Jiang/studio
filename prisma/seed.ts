import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample questions
  const questions = [
    {
      topic: 'JavaScript',
      question: 'What is the difference between let and var in JavaScript?',
      answer: 'let has block scope and cannot be redeclared, while var has function scope and can be redeclared. let also has temporal dead zone.',
      difficulty: 'medium',
    },
    {
      topic: 'React',
      question: 'What is the purpose of useEffect hook?',
      answer: 'useEffect is used to perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM.',
      difficulty: 'medium',
    },
    {
      topic: 'TypeScript',
      question: 'What is the difference between interface and type in TypeScript?',
      answer: 'Interfaces can be extended and merged, while types are more flexible and can represent unions, primitives, and computed types. Both can describe object shapes.',
      difficulty: 'hard',
    },
    {
      topic: 'CSS',
      question: 'What is the CSS box model?',
      answer: 'The CSS box model describes how elements are rendered with content, padding, border, and margin areas from inside to outside.',
      difficulty: 'easy',
    },
    {
      topic: 'JavaScript',
      question: 'What is a closure in JavaScript?',
      answer: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.',
      difficulty: 'hard',
    },
  ];

  for (const questionData of questions) {
    await prisma.question.create({
      data: questionData,
    });
  }

  // Create a sample user
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
    },
  });

  // Create sample user progress
  const topics = ['JavaScript', 'React', 'TypeScript', 'CSS'];
  for (const topic of topics) {
    await prisma.userProgress.create({
      data: {
        userId: user.id,
        topic,
        masteryLevel: Math.random() * 0.8, // Random mastery level between 0 and 0.8
        totalAttempts: Math.floor(Math.random() * 20) + 5,
        correctAttempts: Math.floor(Math.random() * 15) + 2,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${questions.length} questions and 1 user with progress data.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });