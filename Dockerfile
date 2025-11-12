FROM node:20-alpine

# Устанавливаем nginx
RUN apk add --no-cache nginx

# Рабочая директория
WORKDIR /app

# Копируем package.json и ставим зависимости
COPY package*.json ./
RUN npm ci

# Копируем весь проект
COPY . .

# Билдим Next.js
RUN npm run build

# Копируем nginx-конфиг
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Открываем порты
EXPOSE 80 443

# Скрипт старта (nginx + node)
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'nginx &' >> /start.sh && \
    echo 'npm start' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]