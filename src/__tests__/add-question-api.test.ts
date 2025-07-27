import { POST } from '@/app/api/add-question/route';
import { NextRequest } from 'next/server';
import fs from 'fs/promises';

// Mock the fs/promises module
jest.mock('fs/promises');

describe('POST /api/add-question', () => {
  let readFileMock: jest.SpyInstance;
  let writeFileMock: jest.SpyInstance;

  beforeEach(() => {
    // Spy on the fs.readFile and fs.writeFile methods
    readFileMock = jest.spyOn(fs, 'readFile');
    writeFileMock = jest.spyOn(fs, 'writeFile');
    writeFileMock.mockResolvedValue(); // Assume writeFile succeeds
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  it('should add a new question and return 200 on success', async () => {
    const initialFileContent = `export const questions = [
  { id: 'q1', topic: 'Math', question: '2+2?', answer: '4' },
];`;
    readFileMock.mockResolvedValue(initialFileContent);

    const newQuestion = {
      topic: 'History',
      question: 'When did WWII end?',
      answer: '1945',
    };

    const req = new NextRequest(new Request('http://localhost/api/add-question', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Question added successfully');

    // Verify that writeFile was called with the correctly updated content
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const writtenContent = writeFileMock.mock.calls[0][1];
    expect(writtenContent).toContain("topic: 'History'");
    expect(writtenContent).toContain("question: 'When did WWII end?'");
    expect(writtenContent).toContain("answer: '1945'");
    expect(writtenContent).toContain(initialFileContent.replace(/];\s*$/, ''));
  });

  it('should return 400 for invalid request body', async () => {
    const invalidPayload = {
      topic: 'Incomplete',
      // Missing question and answer
    };

    const req = new NextRequest(new Request('http://localhost/api/add-question', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('should return 500 if reading the file fails', async () => {
    readFileMock.mockRejectedValue(new Error('Failed to read file'));

    const newQuestion = {
      topic: 'Science',
      question: 'What is H2O?',
      answer: 'Water',
    };

    const req = new NextRequest(new Request('http://localhost/api/add-question', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('should return 500 if writing the file fails', async () => {
    const initialFileContent = `export const questions = [];`;
    readFileMock.mockResolvedValue(initialFileContent);
    writeFileMock.mockRejectedValue(new Error('Failed to write file'));

    const newQuestion = {
      topic: 'Geography',
      question: 'Capital of France?',
      answer: 'Paris',
    };

    const req = new NextRequest(new Request('http://localhost/api/add-question', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
  });
});
