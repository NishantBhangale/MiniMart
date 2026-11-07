##### stage 1: builder stage #####
FROM dhi.io/node:24-dev AS builder

WORKDIR /app

COPY package*.json /app/

RUN npm ci --omit=dev

##### stage 2: runner stage #####
FROM dhi.io/node:24 AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules

COPY package*.json ./

COPY ./src ./src

USER node

EXPOSE 4000

CMD ["node", "src/index.js"]
