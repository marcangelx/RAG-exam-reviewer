# Exam Prep MVP

A web app that turns your own study material into certification-style practice questions.

Users can sign in, paste notes or upload a `PDF`/`TXT`/`DOCX` file, select the sources they want to study from, generate an exam, then review the questions interactively with hints, answer reveal, explanations, and source evidence.

## Who It Is For

- Learners preparing for certification exams
- Training teams testing whether custom study material can become practice questions
- Product and engineering reviewers evaluating a fast GenAI MVP

## What You Can Do

- Sign in with Cognito Hosted UI
- Add source material by pasting text or uploading `PDF`/`TXT`/`DOCX` files
- See when uploaded files are still processing or ready to use
- Select one or more ready material sources for an exam
- Generate multiple-choice, fill-in-the-blank, and trick-style questions
- Review questions with clickable options, hints, answer reveal, and explanations
- Reopen saved exam jobs from history
- Inspect technical details when debugging API or processing behavior

## How To Use The App

1. Open the deployed web app.
2. Sign in or create an account.
3. Add material in the `Sources` view.
4. Select the ready sources you want to use.
5. Configure the exam in the `Generate` view.
6. Review generated questions or reopen past exams from `History`.

The app checks background jobs automatically while a file is processing or an exam is generating.

## Current MVP Limits

- No billing or admin console yet
- Source selection state is still stored in the browser
- `Delete local sources` clears this browser's source list only
- Backend files and metadata are not deleted by the current UI
- Supported uploads are `PDF`, `TXT`, and `DOCX`
- This is a lightweight grounded-generation MVP, not a full vector-search RAG platform

## Cost Summary

The stack is designed to stay cheap when idle.

- Expected zero-traffic baseline: about `$0.40/month`
- With a Route 53 hosted zone: about `$0.90-$1.00/month`
- OpenAI usage depends on how many exams are generated

The MVP intentionally avoids always-on infrastructure such as NAT Gateway, RDS, ElastiCache, ECS, Kubernetes, and vector databases.

## Build And Deploy

Use the single validation entrypoint:

`bash tests/test.sh`

Deploy the dev stack and frontend:

`./scripts/deploy-dev.sh`

The deploy script builds the SAM app, deploys the stack, syncs the frontend to S3, and invalidates CloudFront.

## Documentation

- [Product requirements](docs/prd.md)
- [Technical architecture](docs/architecture.md)
- [Operations guide](docs/operations.md)
- [Agent workflow rules](AGENTS.md)

## Tech At A Glance

- Frontend: Angular
- Backend: AWS Lambda on Node.js 20
- Infrastructure: AWS SAM and CloudFormation
- Storage: S3 and DynamoDB
- API: API Gateway HTTP API
- AI provider: OpenAI API
- Auth: Amazon Cognito Hosted UI
- Retry orchestration: AWS Step Functions
