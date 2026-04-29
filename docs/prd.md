# Product Requirements Document

## Problem Statement
Certification candidates often have useful study material but still spend too much time converting it into realistic practice questions. Generic quiz tools are not grounded in the learner's actual notes, course handouts, or PDFs, which makes practice less relevant and less efficient.

## Target Users
- Individual learners preparing for certification exams
- Early adopters who want self-serve study acceleration, not enterprise training workflows

## Core Value Proposition
Upload your own study material, choose the exam style you want to practice, and get grounded certification-style questions with answers, explanations, and difficulty signals.

## MVP Features
- Angular web app hosted on AWS
- Text paste ingestion
- PDF, TXT, and DOCX file upload ingestion
- Async processing and job status polling
- Question generation with:
  - Multiple choice
  - Fill in the blank
  - Trick/distractor questions
- Persisted latest generated exam result in S3
- DynamoDB metadata for knowledge assets and generation jobs
- User accounts and per-user isolation
- Saved exam history
- Certification profiles
- Step Functions retry orchestration for generation

## Non-Goals
- Billing
- Vector database or full RAG pipeline
- Admin tooling or moderation workflow
- Collaboration, flashcards, spaced repetition, or mobile apps
- Bedrock provider abstraction in Phase 1

## Phase Breakdown
### Phase 1
- Shared beta app
- OpenAI-first inference
- S3 + DynamoDB + Lambda + API Gateway + CloudFront
- PDF/TXT ingestion
- Async job polling

### Phase 2
- User accounts and per-user isolation: implemented with Cognito and user-scoped data
- DOCX support: implemented with DOCX text extraction
- Saved exam history: implemented with user-scoped job listing
- Certification profiles: implemented as static profile presets
- Better retry orchestration: implemented with Step Functions

### Phase 3
- Embeddings and vector retrieval
- Adaptive difficulty
- Evaluation harness
- Multi-provider inference abstraction
- True SaaS tenancy controls
