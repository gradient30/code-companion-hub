#!/usr/bin/env bash
set -euo pipefail

################################
# 配置区
################################
REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_TMP_DIR="${REMOTE_TMP_DIR:-/tmp}"

REPO_NAME="$(basename "$(git rev-parse --show-toplevel)")"
BUNDLE_NAME="${REPO_NAME}.delta.bundle"


SYNC_ID_FILE="last_sync_id"

################################
# 工具函数
################################
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  echo "❌ ERROR: $*" >&2
  exit 1
}

################################
# Step 0: 前置校验
################################
log "🔍 校验当前目录是否为 git 仓库"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || fail "当前目录不是 git 仓库"

ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
[[ -n "${ORIGIN_URL}" ]] \
  || fail "请先配置 origin，例如 git remote add origin ${REMOTE_HOST:-tcloud}:/root/cnb_repo/git/${REPO_NAME}.git"

if [[ "${ORIGIN_URL}" =~ ^([^:]+):(.+\.git)$ ]]; then
  ORIGIN_HOST="${BASH_REMATCH[1]}"
  REMOTE_REPO_PATH="${BASH_REMATCH[2]}"
else
  fail "origin 必须是 SSH 路径，例如 tcloud:/root/cnb_repo/git/${REPO_NAME}.git"
fi

REMOTE_HOST="${REMOTE_HOST:-${ORIGIN_HOST:-tcloud}}"
REMOTE_BUNDLE_PATH="${REMOTE_HOST}:${REMOTE_TMP_DIR}/${BUNDLE_NAME}"

################################
# Step 1: SSH 预热（无人值守关键）
################################
log "🔐 SSH 预热（known_hosts / 风控放行）"

ssh -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "${REMOTE_HOST}" "true" \
    || fail "SSH 预热失败，无法连接 ${REMOTE_HOST}"

log "✅ SSH 预热完成"

################################
# Step 2: 确定同步基线（权威来源：origin）
################################
log "📍 确定同步基线（origin/main）"

git fetch origin >/dev/null 2>&1 || true

BASE_COMMIT="$(git rev-parse origin/main 2>/dev/null || true)"

if [[ -z "${BASE_COMMIT}" ]]; then
  fail "无法获取 origin/main，请确认远端存在"
fi

echo "${BASE_COMMIT}" > "${SYNC_ID_FILE}"

log "✅ 同步基线 = ${BASE_COMMIT}"

################################
# Step 3: 创建增量 bundle
################################
log "📦 创建增量 bundle"

rm -f "${BUNDLE_NAME}"

git bundle create "${BUNDLE_NAME}" main "^${BASE_COMMIT}" \
  || fail "git bundle 创建失败"

[[ -s "${BUNDLE_NAME}" ]] \
  || fail "bundle 文件为空（无新提交或异常）"

log "✅ bundle 创建成功"

################################
# Step 4: 上传 bundle（scp）
################################
log "🚀 上传 bundle 到云主机"

scp -O \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    "${BUNDLE_NAME}" "${REMOTE_BUNDLE_PATH}" \
  || fail "scp 上传失败"

log "✅ bundle 上传成功"

################################
# Step 5: 在云主机裸仓库导入增量 bundle
################################
log "📥 在云主机裸仓库导入增量 bundle"

ssh -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "${REMOTE_HOST}" \
    "FETCH_STATUS=0; git --git-dir '${REMOTE_REPO_PATH}' fetch '${REMOTE_TMP_DIR}/${BUNDLE_NAME}' 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*' || FETCH_STATUS=\$?; rm -f '${REMOTE_TMP_DIR}/${BUNDLE_NAME}'; exit \"\${FETCH_STATUS}\"" \
    || fail "远程导入增量 bundle 失败"

log "✅ 远程导入完成"

################################
# Step 6: 刷新本地远端状态
################################
log "🔄 刷新 origin 状态"

git fetch origin \
  || fail "git fetch origin 失败"

################################
# Step 7: 更新 last_sync_id（最终裁决）
################################
NEW_SYNC_ID="$(git rev-parse origin/main)"
echo "${NEW_SYNC_ID}" > "${SYNC_ID_FILE}"

log "🎉 同步完成，last_sync_id = ${NEW_SYNC_ID}"
