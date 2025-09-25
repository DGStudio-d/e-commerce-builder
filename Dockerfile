# Multi-stage build: build React app then serve with Nginx

# 1) Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite/React build creates dist/
RUN npm run build --if-present

# 2) Runtime stage
FROM nginx:alpine
# Copy built assets to Nginx html dir
COPY --from=build /app/dist /usr/share/nginx/html
# Provide a basic default.conf for SPA routing (optional)
RUN printf "server {\n  listen 80;\n  server_name _;\n  # Ensure redirects keep the host port when behind port mapping\n  port_in_redirect on;\n  # Prefer relative redirects to avoid port stripping\n  absolute_redirect off;\n  root /usr/share/nginx/html;\n  index index.html;\n  # Serve SPA directly without directory redirect\n  location = / {\n    try_files /index.html =404;\n  }\n  location / {\n    try_files $uri /index.html =404;\n  }\n  location /assets/ {\n    access_log off;\n    expires 30d;\n  }\n}\n" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
