#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:4193/ >/dev/null 2>&1; then
  /usr/bin/nohup '/Users/rachel/.aside/runtime/node/bin/node' tools/preview-local.mjs 4193 > /tmp/exo-book-preview-4193.log 2>&1 < /dev/null &
  for i in {1..20}; do /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:4193/ >/dev/null 2>&1 && break; /bin/sleep 0.2; done
fi
if /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:4193/ >/dev/null 2>&1; then /usr/bin/open http://127.0.0.1:4193/; else echo '启动失败，请查看 /tmp/exo-book-preview-4193.log'; read -r -p '按回车关闭'; fi
