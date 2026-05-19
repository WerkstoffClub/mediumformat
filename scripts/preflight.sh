#!/usr/bin/env bash
# Preflight check — run on the VPS as root (or deploy user) before bootstrap.
# Prints system specs + DNS + port availability. Read-only, no changes.
#
# Usage:  bash scripts/preflight.sh
#  or:    curl -fsSL <raw-url-of-this-file> | bash

set -uo pipefail

c=$'\033[1;36m'; g=$'\033[1;32m'; y=$'\033[1;33m'; r=$'\033[1;31m'; n=$'\033[0m'
ok()   { printf "  ${g}ok${n}    %s\n" "$*"; }
warn() { printf "  ${y}warn${n}  %s\n" "$*"; }
fail() { printf "  ${r}fail${n}  %s\n" "$*"; }
hdr()  { printf "\n${c}==> %s${n}\n" "$*"; }

# ---------------------------------------------------------------------------
hdr "Operating system"
if [[ -r /etc/os-release ]]; then
  . /etc/os-release
  printf "  %s %s (%s)\n" "$NAME" "$VERSION" "${VERSION_CODENAME:-?}"
fi
printf "  kernel  %s\n" "$(uname -r)"
printf "  uptime  %s\n" "$(uptime -p 2>/dev/null || true)"

# ---------------------------------------------------------------------------
hdr "CPU + RAM + disk"
nproc_count="$(nproc 2>/dev/null || echo '?')"
ram_total_mb="$(awk '/^MemTotal:/ {printf "%d", $2/1024}' /proc/meminfo)"
ram_avail_mb="$(awk '/^MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)"
disk_avail_g="$(df --output=avail -BG / | tail -1 | tr -d 'G ')"
disk_total_g="$(df --output=size  -BG / | tail -1 | tr -d 'G ')"

printf "  vCPU             %s\n" "$nproc_count"
printf "  RAM total        %d MB (%.1f GB)\n" "$ram_total_mb" "$(awk "BEGIN{print $ram_total_mb/1024}")"
printf "  RAM available    %d MB\n" "$ram_avail_mb"
printf "  disk / total     %s GB\n" "$disk_total_g"
printf "  disk / free      %s GB\n" "$disk_avail_g"

[[ "$ram_total_mb" -ge 3500 ]] && ok "RAM ≥ 4 GB recommended target" \
  || { [[ "$ram_total_mb" -ge 1800 ]] \
       && warn "RAM is < 4 GB — \`next build\` may OOM. Use the GHA build-and-push flow." \
       || fail "RAM is < 2 GB — too small for this stack as-is."; }

[[ "$disk_avail_g" -ge 30 ]] && ok "disk free ≥ 30 GB" \
  || warn "disk free < 30 GB — backups + photos will fill fast"

[[ "$nproc_count" -ge 2 ]] && ok "≥ 2 vCPU" \
  || warn "only ${nproc_count} vCPU — builds will be slow"

# ---------------------------------------------------------------------------
hdr "Docker"
if command -v docker >/dev/null; then
  ok "docker present: $(docker --version)"
  if docker compose version >/dev/null 2>&1; then
    ok "compose v2 present: $(docker compose version | head -1)"
  else
    warn "docker compose v2 missing (will be installed by bootstrap)"
  fi
else
  warn "docker not installed yet (will be installed by bootstrap)"
fi

# ---------------------------------------------------------------------------
hdr "Public IP"
PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null \
            || curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null \
            || echo 'unknown')"
printf "  this VPS  %s\n" "$PUBLIC_IP"

# ---------------------------------------------------------------------------
hdr "DNS — mediumformat.info"
# apex + www are Cloudflare-proxied so they will NOT resolve to the VPS IP.
# mail must be grey-cloud (direct) so HTTP-01 challenge can reach the origin.
for host in mediumformat.info www.mediumformat.info mail.mediumformat.info; do
  ips="$(getent hosts "$host" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')"
  if [[ -z "$ips" ]]; then
    fail "$host unresolved — set DNS in Cloudflare first"
    continue
  fi
  printf "  %-30s %s\n" "$host" "$ips"
  case "$host" in
    mail.mediumformat.info)
      if [[ "$ips" == *"$PUBLIC_IP"* ]]; then
        ok "$host points directly at this VPS (grey cloud — correct)"
      else
        fail "$host is NOT this VPS — Cloudflare proxy on? Switch to grey cloud or LE will fail."
      fi
      ;;
    *)
      if [[ "$ips" == *"$PUBLIC_IP"* ]]; then
        warn "$host resolves directly to this VPS — Cloudflare proxy is OFF. Turn the orange cloud back on after first deploy."
      else
        ok "$host resolves to Cloudflare edge (proxied — correct)"
      fi
      ;;
  esac
done

# ---------------------------------------------------------------------------
hdr "Ports 80 + 443"
for p in 80 443; do
  if ss -lnt "( sport = :$p )" 2>/dev/null | grep -q LISTEN; then
    holder="$(ss -lntp "( sport = :$p )" 2>/dev/null | awk 'NR>1 {print $NF}')"
    warn "port $p already in use ($holder) — stop it before bootstrap"
  else
    ok "port $p is free"
  fi
done

# ---------------------------------------------------------------------------
hdr "Connectivity"
for target in github.com raw.githubusercontent.com get.docker.com registry-1.docker.io acme-v02.api.letsencrypt.org; do
  if curl -fsS --max-time 5 -o /dev/null "https://$target" 2>/dev/null \
     || curl -fsSI --max-time 5 -o /dev/null "https://$target" 2>/dev/null; then
    ok "https://$target reachable"
  else
    warn "https://$target unreachable — bootstrap may fail"
  fi
done

# ---------------------------------------------------------------------------
hdr "Summary"
echo "  If everything above is OK or only yellow warnings, you're clear to run:"
echo "    ADMIN_EMAIL=… SSH_PUBKEY=… bash scripts/bootstrap-vps.sh"
