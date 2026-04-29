# Operations Guide

This guide covers local validation, deployment, runtime config, and troubleshooting for Phase 2.

## Prerequisites

Required tools:

- Node.js 20
- npm
- AWS CLI
- AWS SAM CLI
- Git Bash on Windows for the deploy script

Recommended AWS profile setup:

`export AWS_PROFILE=AdministratorAccess-<AWS_ACCOUNT_ID>`

## Install Dependencies

Backend dependencies:

`npm install`

Angular dependencies:

`npm --prefix web install`

## Local Validation

Use the single validation entrypoint:

`bash tests/test.sh`

It runs:

- backend unit tests
- Angular production build
- SAM template validation
- SAM build

Individual checks:

`npm test`

`npm --prefix web run build`

`sam validate --template-file infra/template.yaml`

`sam build --template-file infra/template.yaml`

SAM needs `node_modules/.bin` on `PATH` so it can find `esbuild`. The deploy and test scripts set that automatically.

## Dev Deployment

Preferred command:

`./scripts/deploy-dev.sh`

The script:

1. builds the SAM backend
2. deploys the dev stack
3. reads stack outputs
4. builds Angular
5. writes `runtime-config.json` into the Angular dist folder
6. syncs Angular assets to `s3://<bucket>/web/`
7. invalidates CloudFront with `/*`

## Runtime Config

Angular reads:

`assets/runtime-config.json`

The deploy script writes deployed values for:

- `apiBaseUrl`
- `cognitoDomain`
- `cognitoClientId`
- `redirectUri`
- `logoutUri`

For local Angular development, edit `web/src/assets/runtime-config.json` or replace it with stack output values before running:

`npm --prefix web start`

## Stack Outputs

Important outputs:

- `ApiBaseUrl`
- `WebAppUrl`
- `BucketName`
- `MetadataTableName`
- `EffectiveOpenAISecretArn`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`
- `CognitoHostedUiDomain`
- `GenerationStateMachineArn`

Get outputs manually:

`aws cloudformation describe-stacks --stack-name exam-prep-mvp-dev --query "Stacks[0].Outputs" --output table`

## OpenAI Secret Setup

Use the `EffectiveOpenAISecretArn` output:

`aws secretsmanager put-secret-value --secret-id <secret-arn> --secret-string '{"apiKey":"YOUR_OPENAI_API_KEY"}'`

The generator Lambda expects JSON with an `apiKey` field.

## Cognito Notes

The stack creates:

- Cognito User Pool
- Cognito User Pool Client
- Cognito Hosted UI domain
- API Gateway JWT authorizer

The Angular app uses Hosted UI authorization code with PKCE. No client secret is used in the browser.

## Troubleshooting

If the app redirects incorrectly after sign-in:

- confirm `runtime-config.json` has the deployed `WebAppUrl`
- confirm Cognito app client callback/logout URLs include that CloudFront URL

If API calls return unauthorized:

- sign out and sign in again
- confirm Angular is sending `Authorization: Bearer <access_token>`
- confirm the API route is using the Cognito JWT authorizer

If uploads stay `UPLOADED`:

- check `ProcessKnowledgeFunction` logs
- confirm files are under `users/{sub}/uploads/`
- confirm S3 EventBridge notifications are enabled

Command:

`sam logs -n ProcessKnowledgeFunction --stack-name exam-prep-mvp-dev --tail`

If DOCX processing fails:

- confirm the backend was built after installing `mammoth`
- try a simple DOCX with selectable text
- scanned image-only documents will not produce useful text

If generation fails:

- confirm the OpenAI secret is valid
- check the Step Functions execution
- check `GenerateExamFunction` logs
- check whether `MarkExamJobFailedFunction` marked the final failure

Command:

`sam logs -n GenerateExamFunction --stack-name exam-prep-mvp-dev --tail`

If the frontend looks stale:

- run `./scripts/deploy-dev.sh`
- hard refresh the browser after CloudFront invalidation completes

## Production Gaps

Still out of scope:

- billing
- admin console
- backend delete APIs
- retention policies
- rate limits
- tenant administration
- vector search
