FROM ghcr.io/pmmp/pocketmine-mp:latest

EXPOSE 19132/udp
VOLUME [ "/data", "/plugins" ]
USER root

COPY ./resources/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkfifo /tmp/cmd

ENTRYPOINT ["/entrypoint.sh"]