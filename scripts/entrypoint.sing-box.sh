#!/bin/bash
set -euo pipefail

sleep 2

MARK=990
TABLE=444
PRIORITY=8000

VPN_IPV4="172.31.0.32"
VPN_GW4="172.31.0.4"

VPN_GW6="fd01:beee:beee::4"

VPN=$(ip -o -4 addr show | awk -v ip="$VPN_IPV4" '$0 ~ ip {print $2; exit}')

if [ -z "${VPN:-}" ]; then
  echo "Cannot find interface with IPv4 address $VPN_IPV4"
  ip -4 addr show
  exit 1
fi

echo "Policy route interface: $VPN"

# IPv4: marked packets use table 444
ip rule del fwmark "$MARK" table "$TABLE" 2>/dev/null || true
ip rule add fwmark "$MARK" table "$TABLE" priority "$PRIORITY"

ip route flush table "$TABLE" 2>/dev/null || true
ip route add default via "$VPN_GW4" dev "$VPN" table "$TABLE" onlink

# IPv6: marked packets use table 444
ip -6 rule del fwmark "$MARK" table "$TABLE" 2>/dev/null || true
ip -6 rule add fwmark "$MARK" table "$TABLE" priority "$PRIORITY"

ip -6 route flush table "$TABLE" 2>/dev/null || true
ip -6 route add default via "$VPN_GW6" dev "$VPN" table "$TABLE" onlink

echo "=== ip rules ==="
ip rule show
[ "$ENABLE_IPV6" = "1" ] && ip -6 rule show || true

echo "=== table $TABLE ==="
ip route show table "$TABLE"
[ "$ENABLE_IPV6" = "1" ] && ip -6 route show table "$TABLE" || true

echo "=== route test ==="
ip route get 1.1.1.1 || true
ip route get 1.1.1.1 mark "$MARK" || true

exec sing-box -D /var/lib/sing-box -C /etc/sing-box/ run