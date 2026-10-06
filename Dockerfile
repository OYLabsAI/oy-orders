FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps apps
COPY packages packages
COPY scripts scripts
COPY workflows workflows
COPY docs/evidence/orca_orders.so docs/evidence/orca_orders.so
COPY tsconfig.json ./
RUN pnpm build
ENV HOST=0.0.0.0 PORT=8787 DATA_DIR=/data MODE=rehearsal
EXPOSE 8787
VOLUME ["/data"]
CMD ["pnpm", "start"]
