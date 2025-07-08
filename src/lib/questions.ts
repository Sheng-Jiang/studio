export type Question = {
  id: string;
  question: string;
  answer: string;
  topic: string;
};

export const questions: Question[] = [
  // Math
  { id: 'm1', question: 'What is the value of Pi to two decimal places?', answer: '3.14', topic: 'Math' },
  { id: 'm2', question: 'What is the Pythagorean theorem?', answer: 'a² + b² = c²', topic: 'Math' },
  { id: 'm3', question: 'What is 12 * 12?', answer: '144', topic: 'Math' },
  { id: 'm4', question: 'Solve for x: 2x + 5 = 15', answer: 'x = 5', topic: 'Math' },
  { id: 'm5', question: 'What is the area of a circle with a radius of 5?', answer: '25π or approx 78.54', topic: 'Math' },
  { id: 'm6', question: 'How many degrees are in a right angle?', answer: '90', topic: 'Math' },
  { id: 'm7', question: 'What is the square root of 64?', answer: '8', topic: 'Math' },
  { id: 'm8', question: 'What is the next prime number after 13?', answer: '17', topic: 'Math' },
  { id: 'm9', question: 'What does "k" represent in the equation y = kx?', answer: 'The constant of proportionality', topic: 'Math' },
  { id: 'm10', question: 'How many sides does a hexagon have?', answer: '6', topic: 'Math' },
  { id: 'm11', question: 'What is 7 cubed (7³)?', answer: '343', topic: 'Math' },
  { id: 'm12', question: 'What is the formula for the volume of a sphere?', answer: 'V = (4/3)πr³', topic: 'Math' },
  { id: 'm13', question: 'What is the least common multiple of 6 and 8?', answer: '24', topic: 'Math' },
  { id: 'm14', question: 'What is the definition of an isosceles triangle?', answer: 'A triangle with at least two equal sides', topic: 'Math' },
  { id: 'm15', question: 'What is the value of the factorial 5! ?', answer: '120', topic: 'Math' },
  
  // Science
  { id: 's1', question: 'What is the chemical symbol for gold?', answer: 'Au', topic: 'Science' },
  { id: 's2', question: 'What planet is known as the Red Planet?', answer: 'Mars', topic: 'Science' },
  { id: 's3', question: 'What is the powerhouse of the cell?', answer: 'Mitochondria', topic: 'Science' },
  { id: 's4', question: 'What is H2O more commonly known as?', answer: 'Water', topic: 'Science' },
  { id: 's5', question: 'What force pulls objects towards the center of the Earth?', answer: 'Gravity', topic: 'Science' },
  { id: 's6', question: 'What is the hardest natural substance on Earth?', answer: 'Diamond', topic: 'Science' },
  { id: 's7', question: 'At what temperature does water boil at sea level?', answer: '100°C or 212°F', topic: 'Science' },
  { id: 's8', question: 'How many planets are in our solar system?', answer: '8', topic: 'Science' },
  { id: 's9', question: 'What is the process by which plants make their own food?', answer: 'Photosynthesis', topic: 'Science' },
  { id: 's10', question: 'What is the unit of electrical resistance?', answer: 'Ohm (Ω)', topic: 'Science' },
  { id: 's11', question: 'What gas do humans exhale when they breathe?', answer: 'Carbon Dioxide (CO2)', topic: 'Science' },
  { id: 's12', question: 'What is the study of fossils called?', answer: 'Paleontology', topic: 'Science' },
  { id: 's13', question: 'Which of Newton\'s Laws states that for every action, there is an equal and opposite reaction?', answer: 'The Third Law', topic: 'Science' },
  { id: 's14', question: 'What is the largest organ in the human body?', answer: 'The skin', topic: 'Science' },
  { id: 's15', question: 'What type of star is our sun?', answer: 'A yellow dwarf star', topic: 'Science' },

  // History
  { id: 'h1', question: 'In what year did the Titanic sink?', answer: '1912', topic: 'History' },
  { id: 'h2', question: 'Who was the first President of the United States?', answer: 'George Washington', topic: 'History' },
  { id: 'h3', question: 'The ancient Egyptians are famous for building what?', answer: 'Pyramids', topic: 'History' },
  { id: 'h4', question: 'What was the main cause of the American Civil War?', answer: 'Slavery', topic: 'History' },
  { id: 'h5', question: 'Who discovered America in 1492?', answer: 'Christopher Columbus', topic: 'History' },
  { id: 'h6', question: 'Which empire was ruled by Julius Caesar?', answer: 'The Roman Empire', topic: 'History' },
  { id: 'h7', question: 'The Renaissance began in which country?', answer: 'Italy', topic: 'History' },
  { id: 'h8', question: 'What event started World War I?', answer: 'The assassination of Archduke Franz Ferdinand', topic: 'History' },
  { id: 'h9', question: 'Who wrote the Declaration of Independence?', answer: 'Thomas Jefferson', topic: 'History' },
  { id: 'h10', question: 'What was the name of the ship the Pilgrims sailed on to America in 1620?', answer: 'The Mayflower', topic: 'History' },
  { id: 'h11', question: 'Who was the queen of ancient Egypt known for her beauty?', answer: 'Cleopatra', topic: 'History' },
  { id: 'h12', question: 'The Magna Carta, signed in 1215, limited the power of which English king?', answer: 'King John', topic: 'History' },
  { id: 'h13', question: 'The Cold War was a standoff between which two superpowers?', answer: 'The United States and the Soviet Union', topic: 'History' },

  // Literature
  { id: 'l1', question: 'Who wrote "Romeo and Juliet"?', answer: 'William Shakespeare', topic: 'Literature' },
  { id: 'l2', question: 'In "The Hobbit", what is the name of the dragon?', answer: 'Smaug', topic: 'Literature' },
  { id: 'l3', question: 'Who is the author of the Harry Potter series?', answer: 'J.K. Rowling', topic: 'Literature' },
  { id: 'l4', question: 'What is the name of the protagonist in "The Catcher in the Rye"?', answer: 'Holden Caulfield', topic: 'Literature' },
  { id: 'l5', question: 'Which novel begins with "Call me Ishmael"?', answer: 'Moby-Dick', topic: 'Literature' },
  { id: 'l6', question: 'Who wrote the epic poems "The Iliad" and "The Odyssey"?', answer: 'Homer', topic: 'Literature' },
  { id: 'l7', question: 'In "Pride and Prejudice", who does Elizabeth Bennet marry?', answer: 'Mr. Darcy', topic: 'Literature' },
  { id: 'l8', question: 'Who is the author of "To Kill a Mockingbird"?', answer: 'Harper Lee', topic: 'Literature' },
  { id: 'l9', question: 'What is the name of the fictional city where Batman operates?', answer: 'Gotham City', topic: 'Literature' },
  { id: 'l10', question: 'Which book series is set in the fictional land of Narnia?', answer: 'The Chronicles of Narnia', topic: 'Literature' },
  { id: 'l11', question: 'Who wrote the dystopian novel "1984"?', answer: 'George Orwell', topic: 'Literature' },
  { id: 'l12', question: 'In "Alice in Wonderland", which character is known for his perpetual grin?', answer: 'The Cheshire Cat', topic: 'Literature' },
];
