FROM node:18-alpine
WORKDIR /app
RUN npm install -g @tomphttp/bare-server-node@2.0.1
EXPOSE 8080
CMD ["bare-server-node", "--port", "8080"]