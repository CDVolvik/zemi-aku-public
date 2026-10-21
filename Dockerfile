# Zemi-Aku: the front page, the live map, and the API in one Node 22 process.
# Qloo's harness (qloo mcp) needs Node 22.19+ and a long-running process, so this runs as a
# container rather than serverless functions. Keys come in at run time (--env-file), never baked in.
FROM node:22-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /srv/zemi
COPY package.json pnpm-lock.yaml ./
# The official harness publishes an npm shrinkwrap with vulnerable transitive pins.
# pnpm's explicit overrides keep the harness and reproducibly install patched versions.
RUN npm install --global pnpm@10.14.0 \
    && pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm store prune && npm cache clean --force

COPY app ./app
COPY data ./data
COPY server ./server
COPY scripts/serve-eagle.mjs scripts/qloo.mjs ./scripts/
# Open-licence ground data ships in the image (scripts/overture.py, scripts/wikidata.mjs).
# Qloo's town catalogs are harvested at run time into cache/catalog; mount a volume to keep them.
COPY cache/overture ./cache/overture
COPY cache/wikidata ./cache/wikidata
COPY cache/census ./cache/census
# Derived per-town numbers from scripts/opportunity.mjs (Qloo heatmap + Census CBP); private image, never the repo.
COPY cache/opportunity ./cache/opportunity
RUN mkdir -p cache/catalog cache/testers && chown node:node cache cache/catalog cache/testers

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/voices').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "scripts/serve-eagle.mjs"]
