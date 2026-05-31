# Use official Node.js image
FROM node:20

#create working directory
WORKDIR /app

#Copy package files first
COPY package*.json ./

#Install dependencies
RUN npm install

#Copy project files
COPY . .

#Expose backend port 
EXPOSE 5000

#Start backend
CMD ["npm", "run", "dev"]

