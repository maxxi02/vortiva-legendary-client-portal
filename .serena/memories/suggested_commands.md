# Suggested Commands

## Dev
```
pnpm dev          # start dev server on localhost:3000
pnpm build        # production build
pnpm start        # start production server
pnpm lint         # run eslint
```

## shadcn components
```
pnpm dlx shadcn@latest add <component>
```

## Prisma (after installing)
```
pnpm dlx prisma init
pnpm dlx prisma migrate dev --name <name>
pnpm dlx prisma generate
pnpm dlx prisma studio
pnpm dlx ts-node prisma/seed.ts
```

## Install missing deps
```
pnpm add prisma @prisma/client
pnpm add next-auth@beta
pnpm add zustand
pnpm add @tanstack/react-query
pnpm add recharts
pnpm add pusher pusher-js
pnpm add zod
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event
```

## Git (Windows)
```
git status
git add <file>
git commit -m "message"
git log --oneline
```
