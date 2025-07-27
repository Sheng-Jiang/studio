import { NextResponse } from 'next/server';
import { checkDatabaseConnection, getConnectionInfo } from '@/lib/db';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const dbHealthStatus = await checkDatabaseConnection();
    const connectionInfo = getConnectionInfo();
    
    const health = {
      status: dbHealthStatus.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {
        database: {
          status: dbHealthStatus.isHealthy ? 'connected' : 'disconnected',
          latency: dbHealthStatus.latency,
          provider: connectionInfo.provider,
          error: dbHealthStatus.error
        },
      },
      uptime: process.uptime(),
    };

    return NextResponse.json(health, {
      status: dbHealthStatus.isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {
        database: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
      },
      uptime: process.uptime(),
    }, {
      status: 503,
    });
  }
}