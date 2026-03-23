FROM node:18-alpine

WORKDIR /app

RUN npm install -g @tomphttp/bare-server-node

EXPOSE 8081

CMD ["bare-server-node", "--port", "8080", "--host", "0.0.0.0"]