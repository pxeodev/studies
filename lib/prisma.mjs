import { PrismaClient } from "@prisma/client";
import { createPrismaQueryEventHandler } from 'prisma-query-log';

let prisma
let prismaOptions = {}
if (process.env.NODE_ENV === 'development') {
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
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaOptions)
  }
  prisma = global.prisma
}
// if (process.env.NODE_ENV === 'development') {
//   const log = createPrismaQueryEventHandler();
//   prisma.$on('query', log);
// }
export default prisma