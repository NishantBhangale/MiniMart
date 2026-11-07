##### stage 1: builder stage #####
FROM dhi.io/node:24-dev AS builder

WORKDIR /app

COPY package*.json /app/

RUN npm ci --omit=dev

COPY . .

RUN npm run build

##### stage 2: runner stage #####
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

RUN addgroup -S minimart && adduser -S minimart -G minimart \
    && chown -R minimart:minimart \
       /var/cache/nginx \
       /var/log/nginx \
       /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown minimart:minimart /var/run/nginx.pid

USER minimart

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]



