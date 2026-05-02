FROM debian:trixie-slim

WORKDIR /app

ARG INSTALL_LINK

RUN apt update && apt install -y \
  wget \
  unzip \
  libcurl4

RUN wget -O server.zip $INSTALL_LINK && \
  unzip server.zip && \
  rm server.zip

RUN mkfifo /tmp/cmd

CMD ["sh", "-c", "tail -f /tmp/cmd | ./bedrock_server"]