This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

1. First make sure you have the necessary software installed on your computer:

- [Node.js/NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install)
- [PostgreSQL](https://www.postgresql.org/download/)

2. Now install the necessary packages with `yarn install`.
3. Create the PostgreSQL database with `createdb coinrotator`.
4. Create a file called `.env` in the root folder and ask a dev to give you it's content.
5. Seed your database with this command `pg_restore --verbose --clean --no-acl --no-owner -h localhost -U <username> -d coinrotator seed.dump` (replace <username> with your username).
6. Now you can run the development server with `yarn dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy

Simply push the main branch, that's it.
