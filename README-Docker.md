# FlashTest - Docker Deployment Guide

This application has been refactored to run as a containerized application instead of Firebase hosting.

## Prerequisites

- Docker and Docker Compose installed
- Google AI API key (for Gemini integration)

## Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env.local
```

2. Add your Google AI API key to `.env.local`:
```
GOOGLE_GENAI_API_KEY=your_actual_api_key_here
```

## Running the Application

### Production Mode

Build and run the production container:
```bash
npm run docker:build
npm run docker:run
```

Or use Docker Compose:
```bash
npm run docker:prod
```

The app will be available at http://localhost:3000

### Development Mode

Run with hot reload for development:
```bash
npm run docker:dev
```

The app will be available at http://localhost:9002

### Manual Docker Commands

Build the image:
```bash
docker build -t flashtest .
```

Run the container:
```bash
docker run -p 3000:3000 --env-file .env.local flashtest
```

Stop containers:
```bash
npm run docker:stop
```

## Health Check

The application includes a health check endpoint:
```bash
curl http://localhost:3000/api/health
```

## Changes Made

- Removed Firebase App Hosting configuration (`apphosting.yaml`)
- Removed Firebase SDK dependency
- Added Docker configuration files
- Added health check endpoint
- Kept Google AI integration via Genkit (no Firebase required)
- Added npm scripts for Docker operations

## AI Integration

The app still uses Google's Genkit with Gemini 2.0 Flash for performance analysis. No Firebase backend is required - just the Google AI API key.