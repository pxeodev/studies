import { PrismaClient } from "@prisma/client";
import { createPrismaQueryEventHandler } from 'prisma-query-log';

let prisma
let prismaOptions = {}
if (process.env.NODE_ENV === 'development' || process.env.VERCEL_REGION) {
  prismaOptions = {
    log: [
        {
            level: 'query',
            emit: 'event',
        },
    ],
  }
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions)
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient(prismaOptions)
  }
  prisma = globalThis.prisma
}
if (process.env.NODE_ENV === 'development' || process.env.VERCEL_REGION) {
  const log = createPrismaQueryEventHandler({
    queryDuration: true,
    format: true
  });
  prisma.$on('query', log);
}
export default prisma