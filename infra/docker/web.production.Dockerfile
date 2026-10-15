FROM node:22-alpine AS dependencies

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_APP_TIME_ZONE=America/New_York
ENV NEXT_PUBLIC_APP_TIME_ZONE=$NEXT_PUBLIC_APP_TIME_ZONE
ENV API_BASE_URL=http://api:8000

COPY --from=dependencies /app/node_modules ./node_modules
COPY apps/web/package.json apps/web/package-lock.json ./
COPY apps/web/next.config.ts apps/web/tsconfig.json apps/web/next-env.d.ts ./
COPY apps/web/public ./public
COPY apps/web/src ./src

RUN npm run build


FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system nodejs \
    && adduser --system --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "server.js"]
