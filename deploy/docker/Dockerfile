# ==========================================================================
# OPTIONAL — baked self-contained image (site content lives INSIDE the image).
#
# The primary/documented path is the bind-mount stack (docker-compose.yml +
# sync.sh), which needs no build and serves content changes live. Use THIS
# only if you later want a single portable image to push to a registry
# (GHCR/Docker Hub) so any host can `docker pull` the exact same site.
#
# Build from the REPO ROOT (context must include the web-root files):
#     docker build -f deploy/docker/Dockerfile -t mediumformat-site:latest .
#
# Run standalone (persist certs in a named volume):
#     docker run -d --name mediumformat-web --restart unless-stopped \
#       -p 80:80 -p 443:443 -v caddy_data:/data -v caddy_config:/config \
#       mediumformat-site:latest
# ==========================================================================
FROM caddy:2-alpine

# Bakes the self-hosted (auto-HTTPS) config — a registry image implies a bare host.
COPY deploy/docker/Caddyfile.selfhosted /etc/caddy/Caddyfile

WORKDIR /srv
# Web root allowlist — keep in sync with sync.sh INCLUDES.
COPY index.html 404.html favicon.svg robots.txt sitemap.xml site.webmanifest ./
COPY mockup-*.html ./
COPY design-system ./design-system
