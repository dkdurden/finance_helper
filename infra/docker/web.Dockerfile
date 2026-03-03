FROM node:20-alpine

WORKDIR /app

EXPOSE 3000

CMD ["sh", "-c", "while true; do echo 'web placeholder running on :3000'; sleep 3600; done"]