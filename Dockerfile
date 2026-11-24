# syntax=docker/dockerfile:1

# 构建阶段：只保留产物与运行镜像所需的最小集合。
FROM oven/bun:1.4.4-alpine AS build

WORKDIR /app

# 依赖清单先复制：源码变动时复用依赖层缓存。
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# 运行阶段：静态资源交给 nginx。TLS 由外围网关终止，容器只监听 HTTP。
FROM nginx:1.29-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# 预压缩静态资源，网关直传 .gz 时省一次压缩；不需要时也可忽略。
RUN find /usr/share/nginx/html -type f \
      \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' \) \
      -exec gzip -9 -k {} \; \
  && chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/healthz || exit 1
