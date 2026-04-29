#!/usr/bin/env bash
set -euo pipefail

export PATH="$(pwd)/node_modules/.bin:${PATH}"

resolve_sam() {
  command -v sam.cmd || command -v sam || {
    for candidate in "/c/Program Files/Amazon/AWSSAMCLI/bin/sam.cmd" "/c/Program Files/Amazon/AWSSAMCLI/bin/sam.exe"; do
      if [[ -f "${candidate}" ]]; then
        printf '%s\n' "${candidate}"
        return 0
      fi
    done
    return 1
  }
}

SAM_BIN="${SAM_BIN:-$(resolve_sam || true)}"
if [[ -z "${SAM_BIN}" ]]; then
  echo "Could not find SAM CLI. Ensure sam.cmd or sam is available in PATH." >&2
  exit 1
fi

npm test
npm --prefix web run build
"${SAM_BIN}" validate --template-file infra/template.yaml
"${SAM_BIN}" build --template-file infra/template.yaml
