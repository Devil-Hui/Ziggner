#!/usr/bin/env bash
# =============================================================================
# 混沌演练：Redis 故障注入（测试拓扑，不碰生产）
#
# 目标：验证「Redis 宕机 → 服务降级生效 → 恢复后自愈」。
#   - 故障注入：docker stop ziggner-test-redis
#   - 验证点1：Redis 挂掉期间，Django 仍响应（不 5xx 崩溃 / 进程存活）
#   - 验证点2：docker start 恢复后，接口恢复正常（自愈）
#
# 环境：需已拉起 docker-compose.test.yml 的 db/redis + 本脚本自动起临时 Django。
#
# 用法：
#   bash scripts/chaos/chaos_redis.sh
# =============================================================================
set -uo pipefail

TEST_MYSQL=${TEST_MYSQL:-ziggner-test-mysql}
TEST_REDIS=${TEST_REDIS:-ziggner-test-redis}
WEB_CONTAINER=ziggner-chaos-web
PROBE_URL="http://localhost:8001/api/v1/goods/spu"
BACKEND_SRC="$(cd "$(dirname "$0")/../../.." && pwd)/backend"

PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

cleanup() {
  docker rm -f "$WEB_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> [1/5] 启动被测 Django（连接测试 MySQL/Redis）"
docker rm -f "$WEB_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$WEB_CONTAINER" --network ziggner-test-net \
  -v "$BACKEND_SRC":/backend -w /backend \
  -e DJANGO_SETTINGS_MODULE=project.config.settings.dev \
  -e DB_ENGINE=django.db.backends.mysql -e DB_HOST="$TEST_MYSQL" -e DB_PORT=3306 \
  -e DB_NAME=ziggner_test -e DB_USER=ziggner_test -e DB_PASSWORD=ziggner_test \
  -e REDIS_URL="redis://$TEST_REDIS:6379/1" -e REDIS_SLAVE_URL="redis://$TEST_REDIS:6379/1" \
  -e DJANGO_SECRET_KEY=test-only-secret-key-not-for-production \
  -e ENABLE_MOCK_PAYMENT=true -e FILE_STORAGE=local \
  --entrypoint python ziggner-django:v1.0.2 manage.py runserver 0.0.0.0:8001 --noreload >/dev/null 2>&1

echo "  等待服务就绪（最多 30s）…"
for i in $(seq 1 30); do
  if docker exec "$WEB_CONTAINER" python -c "import urllib.request; urllib.request.urlopen('$PROBE_URL', timeout=3)" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> [2/5] 基线：Redis 正常时接口可访问"
if docker exec "$WEB_CONTAINER" python -c "import urllib.request; r=urllib.request.urlopen('$PROBE_URL', timeout=5); assert r.status==200" >/dev/null 2>&1; then
  ok "基线探活 200（Redis 正常）"
else
  bad "基线探活失败——被测服务未就绪，演练终止"
  docker logs "$WEB_CONTAINER" 2>&1 | tail -5
  exit 1
fi

echo "==> [3/5] 故障注入：Kill Redis"
docker stop "$TEST_REDIS" >/dev/null 2>&1
sleep 2

echo "==> [4/5] 验证降级：Redis 宕机期间 Django 行为"
# 进程必须存活
if docker ps --format '{{.Names}}' | grep -q "^$WEB_CONTAINER$"; then
  ok "Django 进程存活（未崩溃）"
else
  bad "Django 进程崩溃——降级失败"
  docker logs "$WEB_CONTAINER" 2>&1 | tail -10
fi

# 接口不应返回 500 崩溃（允许 200 或明确的业务错误码）
code=$(docker exec "$WEB_CONTAINER" python -c "
import urllib.request
try:
    r = urllib.request.urlopen('$PROBE_URL', timeout=45)
    print(r.status)
except urllib.error.HTTPError as e:
    print(e.code)
except Exception:
    print('UNREACHABLE')
" 2>/dev/null)
echo "  Redis 宕机时商品列表 HTTP 状态: $code"
if [ "$code" = "200" ] || [ "$code" = "400" ] || [ "$code" = "404" ] || [ "$code" = "429" ]; then
  ok "降级生效：返回 $code（可服务，非 500 崩溃）"
else
  bad "降级未生效：HTTP $code（Redis 宕机导致 5xx/不可达）"
  docker logs "$WEB_CONTAINER" 2>&1 | tail -5
fi

echo "==> [5/5] 恢复并验证自愈"
docker start "$TEST_REDIS" >/dev/null 2>&1
sleep 3
if docker exec "$WEB_CONTAINER" python -c "import urllib.request; r=urllib.request.urlopen('$PROBE_URL', timeout=5); assert r.status==200" >/dev/null 2>&1; then
  ok "自愈：Redis 恢复后接口 200"
else
  bad "自愈失败：Redis 恢复后接口仍异常"
fi

echo ""
echo "========== 混沌演练（Redis）结果：PASS=$PASS FAIL=$FAIL =========="
[ "$FAIL" -eq 0 ] && echo "降级策略验证通过 ✅" || echo "降级策略存在缺口，需修复 ⚠️"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
