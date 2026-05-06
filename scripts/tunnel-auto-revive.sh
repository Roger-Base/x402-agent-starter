#!/bin/bash
# PERMANENTLY DISABLED — cloudflared quick tunnels are NOT viable for 24/7 agents
# Reason: quick tunnels expire after ~1-2h on sleeping Macs; repeated restarts
# trigger Cloudflare rate-limits. URLs become unresolvable (NXDOMAIN/530/000).
#
# Re-enable ONLY if one of these is true:
#   a) Named persistent tunnel with cloudflared auth token (cloudflared tunnel create)
#   b) Agent runs on a VPS/server that never sleeps
#   c) Using a paid ngrok/Cloudflare Tunnel plan with persistent URL
#   d) Mac sleep is completely disabled (pmset -c sleep 0; pmset -b sleep 0)
#
# Current deployment: localhost-only on 127.0.0.1:3000 (PID 39727, rock solid)
# Article + README updated with honest localhost instructions.
#
# Date disabled: 2026-05-06 10:12 CEST
# Last tunnel URL before death: https://cho-pledge-opportunities-youth.trycloudflare.com

exit 0
