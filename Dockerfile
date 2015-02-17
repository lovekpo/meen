FROM dockerfile/nodejs

WORKDIR /home/meen

# Install Meen.JS Prerequisites
RUN npm install -g grunt-cli
RUN npm install -g bower

# Install Meen.JS packages
ADD package.json /home/meen/package.json
RUN npm install

# Make everything available for start
ADD . /home/meen

# currently only works for development
ENV NODE_ENV development

# Port 3000 for server
# Port 35729 for livereload
EXPOSE 3000 35729
CMD ["grunt"]
