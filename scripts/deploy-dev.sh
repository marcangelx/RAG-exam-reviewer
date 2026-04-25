#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-exam-prep-mvp-dev}"

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

resolve_aws() {
  command -v aws || command -v aws.exe || {
    for candidate in "/c/Program Files/Amazon/AWSCLIV2/aws.exe"; do
      if [[ -f "${candidate}" ]]; then
        printf '%s\n' "${candidate}"
        return 0
      fi
    done
    return 1
  }
}

resolve_npm() {
  command -v npm.cmd || command -v npm || {
    for candidate in "/c/Program Files/nodejs/npm.cmd" "/c/Program Files/nodejs/npm"; do
      if [[ -f "${candidate}" ]]; then
        printf '%s\n' "${candidate}"
        return 0
      fi
    done
    return 1
  }
}

SAM_BIN="${SAM_BIN:-$(resolve_sam || true)}"
AWS_BIN="${AWS_BIN:-$(resolve_aws || true)}"
NPM_BIN="${NPM_BIN:-$(resolve_npm || true)}"

if [[ -z "${SAM_BIN}" ]]; then
  echo "Could not find SAM CLI. Ensure sam.cmd or sam is available in PATH." >&2
  exit 1
fi

if [[ -z "${AWS_BIN}" ]]; then
  echo "Could not find AWS CLI. Ensure aws or aws.exe is available in PATH." >&2
  exit 1
fi

if [[ -z "${NPM_BIN}" ]]; then
  echo "Could not find npm. Ensure npm.cmd or npm is available in PATH." >&2
  exit 1
fi

trim_cr() {
  printf '%s' "$1" | tr -d '\r'
}

export PATH="$(pwd)/node_modules/.bin:${PATH}"

echo "Building SAM application for ${STACK_NAME}..."
"${SAM_BIN}" build --template-file infra/template.yaml

echo "Deploying stack ${STACK_NAME}..."
"${SAM_BIN}" deploy --config-env dev

echo "Resolving deployed web bucket..."
BUCKET_NAME="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)")"
if [[ -z "${BUCKET_NAME}" || "${BUCKET_NAME}" == "None" ]]; then
  echo "Could not resolve BucketName output from stack ${STACK_NAME}." >&2
  exit 1
fi

echo "Resolving frontend runtime configuration..."
API_BASE_URL="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" --output text)")"
WEB_APP_URL="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='WebAppUrl'].OutputValue" --output text)")"
COGNITO_CLIENT_ID="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientId'].OutputValue" --output text)")"
COGNITO_DOMAIN="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CognitoHostedUiDomain'].OutputValue" --output text)")"

echo "Building Angular frontend..."
if [[ ! -d web/node_modules ]]; then
  "${NPM_BIN}" --prefix web install
fi
"${NPM_BIN}" --prefix web run build

RUNTIME_CONFIG_PATH="web/dist/exam-prep/assets/runtime-config.json"
mkdir -p "$(dirname "${RUNTIME_CONFIG_PATH}")"
cat > "${RUNTIME_CONFIG_PATH}" <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}",
  "cognitoDomain": "${COGNITO_DOMAIN}",
  "cognitoClientId": "${COGNITO_CLIENT_ID}",
  "redirectUri": "${WEB_APP_URL}/",
  "logoutUri": "${WEB_APP_URL}/"
}
EOF

echo "Syncing frontend assets to s3://${BUCKET_NAME}/web/ ..."
"${AWS_BIN}" s3 sync web/dist/exam-prep/ "s3://${BUCKET_NAME}/web/" --delete

echo "Resolving CloudFront distribution..."
DISTRIBUTION_ID="$(trim_cr "$("${AWS_BIN}" cloudformation describe-stack-resources --stack-name "${STACK_NAME}" --query "StackResources[?LogicalResourceId=='WebDistribution'].PhysicalResourceId" --output text)")"
if [[ -z "${DISTRIBUTION_ID}" || "${DISTRIBUTION_ID}" == "None" ]]; then
  echo "Could not resolve CloudFront distribution for stack ${STACK_NAME}." >&2
  exit 1
fi

echo "Invalidating cached frontend assets..."
INVALIDATION_PATHS=()
while IFS= read -r path; do
  INVALIDATION_PATHS+=("$(trim_cr "${path}")")
done <<'EOF'
/*
EOF
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' "${AWS_BIN}" cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "${INVALIDATION_PATHS[@]}"

echo "Done."
echo "Stack: ${STACK_NAME}"
echo "Bucket: ${BUCKET_NAME}"
echo "Distribution: ${DISTRIBUTION_ID}"
