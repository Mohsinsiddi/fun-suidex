// ============================================
// MongoDB Connection Manager
// ============================================

import mongoose from 'mongoose'
import { config } from 'dotenv'
config({ path: '.env.local' })
// Connection cache for serverless
interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
}

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

/**
 * Connect to MongoDB (Games Database)
 * Uses connection caching for serverless environments
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

/**
 * Disconnect from MongoDB
 * Useful for CLI scripts
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect()
    cached.conn = null
    cached.promise = null
  }
}

/**
 * Check if connected to MongoDB
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1
}

// ============================================
// Main SuiDex DB Connection (Read-Only)
// ============================================

interface MainDBCache {
  conn: mongoose.Connection | null
  promise: Promise<mongoose.Connection> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mainDBCache: MainDBCache | undefined
}

const MAIN_SUIDEX_MONGODB_URI = process.env.MAIN_SUIDEX_MONGODB_URI

const mainCached: MainDBCache = global.mainDBCache ?? {
  conn: null,
  promise: null,
}

if (!global.mainDBCache) {
  global.mainDBCache = mainCached
}

/**
 * Connect to Main SuiDex MongoDB (Read-Only)
 * For fetching staking data
 */
export async function connectMainDB(): Promise<mongoose.Connection> {
  if (!MAIN_SUIDEX_MONGODB_URI) {
    throw new Error('Please define the MAIN_SUIDEX_MONGODB_URI environment variable')
  }

  if (mainCached.conn) {
    return mainCached.conn
  }

  if (!mainCached.promise) {
    mainCached.promise = mongoose
      .createConnection(MAIN_SUIDEX_MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 5,
      })
      .asPromise()
  }

  try {
    mainCached.conn = await mainCached.promise
  } catch (e) {
    mainCached.promise = null
    throw e
  }

  return mainCached.conn
}
