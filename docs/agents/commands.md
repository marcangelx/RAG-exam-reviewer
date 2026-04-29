# Commands

## Single Validation Entry Point
```bash
bash tests/test.sh
```

## Angular
Requires Node.js `20.19+`, `22.12+`, or `24+` for Angular 21.

```bash
cd web && npm run build -- --progress=false --verbose=false
```

## SAM
```bash
sam validate --template-file infra/template.yaml
sam build --template-file infra/template.yaml --debug false
```

## Deploy
```bash
./scripts/deploy-dev.sh
```

## Output Discipline
- Do not paste full build logs into responses.
- Report only errors, critical warnings, and final status.
- If CloudFront changes are needed, use the deploy script so frontend sync and invalidation stay consistent.
