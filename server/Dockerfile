# Specifies where to get the base image and creates a new container for it
FROM node:14.16.0

# Set working directory. Paths will be relative this WORKDIR.
WORKDIR /server-src

# Install dependencies
COPY package.json .
RUN yarn --frozen-lockfile

# Copy source files from host computer to the container
COPY . .

# Specify port app runs on
EXPOSE 5000

# Run the app
CMD [ "yarn", "start" ]