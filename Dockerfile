FROM node:18-alpine

WORKDIR /app

# Pin to a specific version for stability
RUN npm install -g @tomphttp/bare-server-node@2.0.1

EXPOSE 8080

# Increase keep-alive limit — default is 20, raise to 100
CMD ["bare-server-node", "--port", "8080", "--host", "0.0.0.0", "--keep-alive", "100"]