#!/usr/bin/env bash
# Pull, build, and deploy a prebuilt Vercel artifact.
# Usage: vercel-deploy.sh preview|production
set -euo pipefail

ENVIRONMENT="${1:?usage: vercel-deploy.sh preview|production}"
PROD_FLAGS=()
if [ "$ENVIRONMENT" = "production" ]; then
  PROD_FLAGS=(--prod)
elif [ "$ENVIRONMENT" != "preview" ]; then
  echo "Environment must be preview or production, got: $ENVIRONMENT" >&2
  exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ] || [ -z "${VERCEL_ORG_ID:-}" ] || [ -z "${VERCEL_PROJECT_ID:-}" ]; then
  echo "Add repository secrets VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID." >&2
  exit 1
fi

# Accidental newlines from pasting into GitHub Secrets break the API lookup.
VERCEL_ORG_ID="$(printf '%s' "$VERCEL_ORG_ID" | tr -d '\r\n')"
VERCEL_PROJECT_ID="$(printf '%s' "$VERCEL_PROJECT_ID" | tr -d '\r\n')"
VERCEL_TOKEN="$(printf '%s' "$VERCEL_TOKEN" | tr -d '\r\n')"
export VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN

if [[ ! "$VERCEL_ORG_ID" =~ ^team_ ]]; then
  echo "VERCEL_ORG_ID should start with team_ (from .vercel/project.json orgId). Prefix is '${VERCEL_ORG_ID:0:5}'." >&2
  exit 1
fi
if [[ ! "$VERCEL_PROJECT_ID" =~ ^prj_ ]]; then
  echo "VERCEL_PROJECT_ID should start with prj_ (from .vercel/project.json projectId). Prefix is '${VERCEL_PROJECT_ID:0:4}'." >&2
  exit 1
fi

# Fail with the real API status instead of the CLI's ".vercel directory" message.
http_code="$(
  curl -sS -o /tmp/vercel-project.json -w '%{http_code}' \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_ORG_ID}"
)"
if [ "$http_code" != "200" ]; then
  message="$(jq -r '.error.message // .message // empty' /tmp/vercel-project.json 2>/dev/null || true)"
  echo "Vercel API returned HTTP ${http_code} for this project/team.${message:+ ${message}}" >&2
  echo "The token must belong to an account that can deploy this team project, and the two IDs must not be swapped." >&2
  exit 1
fi

mkdir -p .vercel
printf '{"orgId":"%s","projectId":"%s"}\n' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json

vercel pull --yes --environment="$ENVIRONMENT" --scope="$VERCEL_ORG_ID"
vercel build "${PROD_FLAGS[@]}" --scope="$VERCEL_ORG_ID"
URL="$(vercel deploy --prebuilt "${PROD_FLAGS[@]}" --scope="$VERCEL_ORG_ID")"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "url=$URL" >> "$GITHUB_OUTPUT"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "Deployed to $URL" >> "$GITHUB_STEP_SUMMARY"
fi
echo "Deployed to $URL"
