#!/usr/bin/env bash
set -euo pipefail

# 本地连接与目标仓库参数
REMOTE_HOST="${REMOTE_HOST:-tcloud}"
REMOTE_UPLOAD_DIR="${REMOTE_UPLOAD_DIR:-/home}"
LOCAL_REMOTE_NAME="${LOCAL_REMOTE_NAME:-origin}"
REMOTE_REPO_PATH="${REMOTE_REPO_PATH:-}"

# 远端安全边界：目标裸仓库必须位于这些根目录内
REMOTE_ALLOWED_ROOTS="${REMOTE_ALLOWED_ROOTS:-${REMOTE_GIT_ROOTS:-/root/cnb_repo/git:/root/git_repo/git}}"
REMOTE_TARGET_REMOTE="${REMOTE_TARGET_REMOTE:-upstream}"
REMOTE_LOG="${REMOTE_LOG:-/var/log/git-bundle-sync.log}"
REMOTE_ENV_FILE="${REMOTE_ENV_FILE:-/etc/git-bundle-sync.env}"
PUSH_RETRIES="${PUSH_RETRIES:-3}"
PUSH_SLEEP_BASE="${PUSH_SLEEP_BASE:-5}"
SYNC_ID_FILE="${SYNC_ID_FILE:-last_sync_id}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

normalize_remote_host() {
  local host="$1"
  host="${host##*@}"
  echo "${host%%:*}"
}

# 仅接受指向 REMOTE_HOST 的 ssh/scp 风格远端，并要求仓库路径是绝对路径。
extract_repo_path_from_remote_url() {
  local remote_url="$1"
  local expected_host="$2"
  local host_part=""
  local path_part=""

  if [[ "$remote_url" =~ ^ssh://([^/]+)/(.+)$ ]]; then
    host_part="${BASH_REMATCH[1]}"
    path_part="/${BASH_REMATCH[2]}"
  elif [[ "$remote_url" =~ ^([^:]+):(.+)$ ]]; then
    host_part="${BASH_REMATCH[1]}"
    path_part="${BASH_REMATCH[2]}"
  else
    return 1
  fi

  [[ "$(normalize_remote_host "$host_part")" == "$(normalize_remote_host "$expected_host")" ]] || return 1
  [[ "$path_part" == /* ]] || return 1
  [[ "$path_part" == *.git ]] || return 1

  printf '%s\n' "$path_part"
}

log "校验当前目录是否为 git 仓库"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "当前目录不是 git 仓库"

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="${REPO_NAME:-$(basename "$REPO_ROOT")}"
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

[[ "$BRANCH" != "HEAD" ]] || fail "当前处于 detached HEAD，无法自动识别同步分支"
HEAD_COMMIT="$(git rev-parse "${BRANCH}^{commit}")"

# 优先从本地远端精确解析 tcloud 上的裸仓库路径，避免按仓库名搜索误伤其它仓库。
if [[ -z "$REMOTE_REPO_PATH" ]]; then
  REMOTE_URL="$(git -C "${REPO_ROOT}" remote get-url "${LOCAL_REMOTE_NAME}" 2>/dev/null || true)"
  [[ -n "$REMOTE_URL" ]] || fail "无法读取本地远端 ${LOCAL_REMOTE_NAME}，请设置 REMOTE_REPO_PATH"
  REMOTE_REPO_PATH="$(extract_repo_path_from_remote_url "$REMOTE_URL" "$REMOTE_HOST" || true)"
  [[ -n "$REMOTE_REPO_PATH" ]] || fail "无法从 ${LOCAL_REMOTE_NAME}=${REMOTE_URL} 解析 ${REMOTE_HOST} 上的绝对裸仓库路径，请设置 REMOTE_REPO_PATH"
fi

BUNDLE_NAME="${REPO_NAME}.init.bundle"
BUNDLE_PATH="${REPO_ROOT}/${BUNDLE_NAME}"
REMOTE_BUNDLE_FILE="${REMOTE_UPLOAD_DIR%/}/${BUNDLE_NAME}"
REMOTE_BUNDLE_PATH="${REMOTE_HOST}:${REMOTE_BUNDLE_FILE}"
LOCAL_SYNC_ID_FILE="${REPO_ROOT}/${SYNC_ID_FILE}"

log "SSH 预热并校验远端上传目录"
ssh -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "${REMOTE_HOST}" \
    "mkdir -p '${REMOTE_UPLOAD_DIR%/}' && test -d '${REMOTE_UPLOAD_DIR%/}'" \
    || fail "SSH 预热失败，无法连接 ${REMOTE_HOST} 或创建 ${REMOTE_UPLOAD_DIR}"

log "创建完整初始化 bundle: ${BUNDLE_NAME}"
rm -f "${BUNDLE_PATH}"
git -C "${REPO_ROOT}" bundle create "${BUNDLE_PATH}" "${BRANCH}" || fail "git bundle 创建失败"
[[ -s "${BUNDLE_PATH}" ]] || fail "bundle 文件为空"
git -C "${REPO_ROOT}" bundle verify "${BUNDLE_PATH}" >/dev/null 2>&1 || fail "bundle 校验失败"

log "上传 bundle 到 ${REMOTE_BUNDLE_PATH}"
scp -O \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    "${BUNDLE_PATH}" "${REMOTE_BUNDLE_PATH}" \
    || fail "scp 上传失败"

log "在 ${REMOTE_HOST} 上应用初始化 bundle 并强制同步"
ssh -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "${REMOTE_HOST}" \
    bash -s -- "${REMOTE_BUNDLE_FILE}" "${REPO_NAME}" "${BRANCH}" "${REMOTE_REPO_PATH}" "${REMOTE_ALLOWED_ROOTS}" "${REMOTE_TARGET_REMOTE}" "${REMOTE_LOG}" "${REMOTE_ENV_FILE}" "${PUSH_RETRIES}" "${PUSH_SLEEP_BASE}" "${HEAD_COMMIT}" <<'REMOTE_SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

# 远端阶段只处理一个明确仓库，不再按 bundle 名搜索所有仓库。
bundle_path="$1"
repo="$2"
branch="$3"
target_repo_path="$4"
allowed_roots_raw="$5"
target_remote="$6"
log_path="$7"
env_file="$8"
push_retries="$9"
push_sleep_base="${10}"
expected_commit="${11}"

IFS=':' read -r -a allowed_roots <<< "$allowed_roots_raw"

sanitize_log_line() {
  printf '%s\n' "$*" | sed -E \
    -e 's#(https?://)[^/@[:space:]]+:[^@[:space:]]+@#\1***:***@#g' \
    -e 's#(https?://)[^/@[:space:]]+@#\1***@#g'
}

log() {
  local line
  line="$(sanitize_log_line "$(date '+%F %T %Z') $*")"
  echo "$line"
  if [[ -n "$log_path" ]]; then
    mkdir -p "$(dirname "$log_path")" 2>/dev/null || true
    echo "$line" >> "$log_path" 2>/dev/null || true
  fi
}

fail() {
  log "ERROR: $*"
  exit 1
}

cleanup_lock() {
  flock -u 9 2>/dev/null || true
  exec 9>&- 2>/dev/null || true
}

move_bundle_to_failed() {
  mkdir -p "$failed_dir" 2>/dev/null || true
  mv -f "$bundle_path" "$failed_dir/" 2>/dev/null || true
}

push_with_retry() {
  local attempt=1
  local rc=0
  local out=""
  local push_log=""
  local remote_url=""
  local safe_remote_url=""

  remote_url="$(git remote get-url "$target_remote" 2>/dev/null || true)"
  safe_remote_url="$(sanitize_log_line "$remote_url")"

  while (( attempt <= push_retries )); do
    push_log="$(mktemp)"
    log "push start (attempt ${attempt}/${push_retries}) remote=${target_remote} url=${safe_remote_url}"

    set +e
    GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 push --force "$target_remote" "refs/heads/$branch:refs/heads/$branch" 2>&1 \
      | tee "$push_log" \
      | while IFS= read -r line; do
          log "$line"
        done
    rc=${PIPESTATUS[0]}
    set -e

    out="$(cat "$push_log")"
    rm -f "$push_log"

    if (( rc == 0 )); then
      return 0
    fi

    if echo "$out" | grep -qiE 'without workflow scope|remote rejected|authentication failed|403|denied|insufficient|forbidden|requires|not authorized'; then
      log "push non-retriable (rc=${rc}) remote=${target_remote} url=${safe_remote_url}"
      return "$rc"
    fi

    log "push failed (attempt ${attempt}/${push_retries}, rc=${rc}) remote=${target_remote} url=${safe_remote_url}"
    sleep $(( attempt * push_sleep_base ))
    ((attempt++))
  done

  return "$rc"
}

if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi

failed_dir="${FAILED_DIR:-$(dirname "$bundle_path")/failed}"

[[ -f "$bundle_path" ]] || fail "bundle 不存在: $bundle_path"
[[ "$target_repo_path" == /* ]] || fail "目标仓库路径必须为绝对路径: $target_repo_path"

# 仅允许更新 repo 同名、且位于白名单根目录下的裸仓库。
case "$target_repo_path" in
  */"$repo".git) ;;
  *) fail "目标仓库路径与 repo=${repo} 不匹配: $target_repo_path" ;;
esac

repo_path=""
for root in "${allowed_roots[@]}"; do
  root="${root%/}"
  case "$target_repo_path" in
    "$root"/"$repo".git)
      repo_path="$target_repo_path"
      break
      ;;
  esac
done

[[ -n "$repo_path" ]] || fail "目标仓库路径不在允许目录内: $target_repo_path"
[[ -d "$repo_path" ]] || fail "目标裸仓库不存在: $repo_path"
git -C "$repo_path" rev-parse --is-bare-repository 2>/dev/null | grep -qx "true" || fail "目标不是裸仓库: $repo_path"
git -C "$repo_path" remote get-url "$target_remote" >/dev/null 2>&1 || fail "目标仓库未配置远端 ${target_remote}: $repo_path"

lock_file="${repo_path}/bundle-sync.lock"
exec 9>"$lock_file"
flock -n 9 || fail "仓库锁正忙: $repo_path"

trap cleanup_lock EXIT

log "applying init bundle=${bundle_path} repo=${repo} branch=${branch} repo_path=${repo_path}"
cd "$repo_path"

old="$(git rev-parse "$branch" 2>/dev/null || true)"

if ! git fetch "$bundle_path" "+refs/heads/$branch:refs/heads/$branch" 2>&1 | while IFS= read -r line; do log "$line"; done; then
  log "fetch failed, moving bundle to ${failed_dir}"
  move_bundle_to_failed
  exit 1
fi

new="$(git rev-parse "$branch" 2>/dev/null || true)"
[[ -n "$new" ]] || fail "fetch 后无法解析分支 ${branch}"
[[ "$new" == "$expected_commit" ]] || fail "fetch 后提交不匹配，期望 ${expected_commit}，实际 ${new}"

if ! push_with_retry; then
  log "push failed: ${old} -> ${new}, moving bundle to ${failed_dir}"
  move_bundle_to_failed
  exit 1
fi

rm -f "$bundle_path"
log "force init sync complete: ${old} -> ${new}"
REMOTE_SCRIPT

echo "${HEAD_COMMIT}" > "${LOCAL_SYNC_ID_FILE}"
log "初始化同步完成，last_sync_id = $(cat "${LOCAL_SYNC_ID_FILE}")"
