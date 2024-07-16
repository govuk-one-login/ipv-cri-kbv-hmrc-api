# Set the base image.
FROM amazonlinux:2023.5.20240708.0
RUN yum install -y gcc-c++ make
RUN curl -sL https://rpm.nodesource.com/setup_lts.x | bash -
RUN yum install -y nodejs
RUN npm install npm -g

WORKDIR /

# Set up AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# COPY Files from src directory
COPY package.json /package.json
COPY tsconfig.json /tsconfig.json
COPY jest.config.ts /jest.config.ts
COPY jest-cucumber-config.js /jest-cucumber-config.js
COPY tests/ /tests
COPY apiEndpoints/ /apiEndpoints
COPY utils/ /utils
COPY run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

RUN npm install
ENTRYPOINT [ "/run-tests.sh" ]