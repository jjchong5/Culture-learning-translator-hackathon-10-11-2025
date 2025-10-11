import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  // During build time or when MONGODB_URI is not set, create a placeholder
  clientPromise = Promise.reject(new Error('Invalid/Missing environment variable: "MONGODB_URI"'));
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Cache for database connection
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB database with connection caching
 * @returns Promise<Db> - MongoDB database instance
 * @throws Error if connection fails or MONGODB_URI is not set
 */
export async function connectToDatabase(): Promise<Db> {
  try {
    // Return cached database if available
    if (cachedDb) {
      return cachedDb;
    }

    // Check if MONGODB_URI is set
    if (!uri) {
      throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
    }

    // Wait for client connection
    const client = await clientPromise;

    // Get database instance
    const db = client.db('cultural-translator');

    // Cache the database connection
    cachedDb = db;

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export a module-scoped MongoClient promise for backward compatibility
export default clientPromise;
