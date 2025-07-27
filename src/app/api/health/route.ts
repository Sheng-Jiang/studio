import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/db';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const dbHealthy = await checkDatabaseConnection();
    
    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
    };

    return NextResponse.json(health, {
      status: dbHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {
        database: 'error',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
    });
  }
}