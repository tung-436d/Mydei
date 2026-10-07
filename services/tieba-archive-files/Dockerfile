FROM node:24.20.0-bookworm-slim
WORKDIR /app
COPY services/tieba-archive-files/ ./services/tieba-archive-files/
ENV ARCHIVE_HOST=0.0.0.0 ARCHIVE_PORT=8787 ARCHIVE_DATA_DIR=/data/tieba-archives
RUN mkdir -p /data/tieba-archives && chown node:node /data/tieba-archives
USER node
EXPOSE 8787
VOLUME ["/data/tieba-archives"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/api/archives/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "services/tieba-archive-files/server.mjs"]
