#!/usr/bin/env bash
set -euo pipefail

# First-iteration helper that scans the legacy documentation bundle for outbound links
# and reports their HTTP status codes. This lets instructors fix or replace dead Seeed
# references before the knowledge base migration pulls in fresh content.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
TARGET_DIR="${ROOT_DIR}/OLD DOCS"

if [[ ! -d "${TARGET_DIR}" ]]; then
  echo "ERROR: Expected directory 'OLD DOCS' at repo root but it was not found." >&2
  exit 1
fi

echo "Scanning legacy docs under: ${TARGET_DIR}" >&2

tmp_links_file="$(mktemp)"
trap 'rm -f "${tmp_links_file}"' EXIT

if ! grep -RhoE "https?://[^\"')[:space:]]+" --binary-files=without-match -- "${TARGET_DIR}" > "${tmp_links_file}"; then
  status=$?
  if [[ ${status} -gt 1 ]]; then
    echo "ERROR: Failed while scanning for URLs (grep exit ${status})." >&2
    exit ${status}
  fi
fi

mapfile -t URLS < <(sort -u "${tmp_links_file}")

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "No URLs found in OLD DOCS." >&2
  exit 0
fi

declare -i ok_count=0
declare -i warn_count=0

printf "%-6s %s\n" "CODE" "URL"
printf "%-6s %s\n" "------" "------------------------------------------------------------"

for url in "${URLS[@]}"; do
  http_code="$(curl -s -o /dev/null -w "%{http_code}" "${url}" || echo "ERR")"
  if [[ "${http_code}" == "200" ]]; then
    ((ok_count+=1))
    printf "%-6s %s\n" "${http_code}" "${url}"
  else
    ((warn_count+=1))
    printf "%-6s %s\n" "${http_code}" "${url}"
  fi
  sleep 0.1 # Gentle pacing to avoid hammering remote hosts
done

echo >&2
if [[ ${warn_count} -gt 0 ]]; then
  echo "Found ${warn_count} URL(s) with non-200 responses. Please review and provide replacements." >&2
else
  echo "All ${ok_count} URL(s) in OLD DOCS responded with HTTP 200." >&2
fi
