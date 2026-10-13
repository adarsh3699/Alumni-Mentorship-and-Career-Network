/**
 * P11 MongoDB Connection Manager
 *
 * Singleton connection for Next.js (handles hot-reload in development).
 * Uses the global cache pattern recommended for serverless/edge environments
 * to prevent connection pool exhaustion.
 */

import mongoose from 'mongoose';

/**
 * Global type augmentation for caching the mongoose connection
 * across hot-reloads in development.
 */
declare global {
  var _mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const cached = global._mongooseConnection ?? { conn: null, promise: null };
if (!global._mongooseConnection) {
  global._mongooseConnection = cached;
}

/**
 * Connect to MongoDB. Returns the cached connection if already established.
 *
 * @example
 * ```ts
 * import { connectDB } from '@/lib/db';
 *
 * export async function GET() {
 *   await connectDB();
 *   // ... use repositories
 * }
 * ```
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/p11_alumni_mentorship';

  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    throw new Error(
      'MONGODB_URI environment variable is required in production. ' +
        'Please configure it in your deployment environment.'
    );
  }

  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[DB] MongoDB connected to ${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

/**
 * Disconnect from MongoDB. Useful for graceful shutdown, tests, and CLI tasks.
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('[DB] MongoDB disconnected');
  }
}

/**
 * Get the current connection state.
 * 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
export function getConnectionState(): number {
  return mongoose.connection.readyState;
}

/**
 * Health check utility to probe MongoDB responsiveness and ping latency.
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  readyState: number;
  databaseName?: string;
  latencyMs?: number;
  error?: string;
}> {
  const state = getConnectionState();
  if (state !== 1) {
    return {
      status: 'unhealthy',
      readyState: state,
      error: `MongoDB not connected (state: ${state})`,
    };
  }

  const start = Date.now();
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database instance unavailable');
    }
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;

    return {
      status: 'healthy',
      readyState: state,
      databaseName: mongoose.connection.name,
      latencyMs,
    };
  } catch (err: unknown) {
    return {
      status: 'unhealthy',
      readyState: state,
      error: err instanceof Error ? err.message : 'Database ping failed',
    };
  }
}
