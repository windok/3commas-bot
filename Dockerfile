# Image
FROM node:14.16.1-alpine3.11

ARG WORK_DIR
ARG PORT=3000

WORKDIR $WORK_DIR

# copy package files
COPY package*.json ./

# install modules
RUN npm install

# run application
EXPOSE $PORT

CMD ["npm", "run", "start:dev"]
