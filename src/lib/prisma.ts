import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Log the database host (without credentials) for debugging
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const host = url.hostname;
      if (process.env.NODE_ENV === 'production') {
        console.log(`[Prisma] Connecting to database host: ${host}`);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  } else {
    console.error('[Prisma] WARNING: DATABASE_URL environment variable is not set!');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma