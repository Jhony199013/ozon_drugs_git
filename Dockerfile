############################################
# 🏗️ СТАДИЯ 1 — Установка зависимостей
############################################
FROM node:18-alpine AS deps

# Устанавливаем нужные системные пакеты для node-gyp и других модулей
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (npm ci быстрее и чище)
RUN npm ci


############################################
# 🧩 СТАДИЯ 2 — Сборка приложения
############################################
FROM node:18-alpine AS builder

# Снова ставим нужные утилиты
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем node_modules из первой стадии
COPY --from=deps /app/node_modules ./node_modules

# Копируем весь исходный код
COPY . .

# Собираем проект
RUN npm run build


############################################
# 🚀 СТАДИЯ 3 — Запуск готового приложения
############################################
FROM node:18-alpine AS runner

WORKDIR /app

# Устанавливаем tini (корректное завершение процессов в Docker)
RUN apk add --no-cache tini

# Копируем только нужное из builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Открываем порт
EXPOSE 3000

# Используем tini как init-процесс и запускаем приложение
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]