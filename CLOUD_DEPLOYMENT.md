# 🚀 Guia de Deployment no Google Cloud Run

Este guia explica como fazer deploy do backend do seu app para a nuvem.

## Pré-requisitos

- Conta Google Cloud (com billing habilitado)
- Google Cloud CLI (`gcloud`) instalado
- Docker instalado (para testes locais)

## Passo 1: Criar Projeto no Google Cloud

```bash
# Login no Google Cloud
gcloud auth login

# Criar novo projeto (ou usar um existente)
gcloud projects create gestao-obras-api --name="Gestão de Obras API"

# Definir como projeto padrão
gcloud config set project gestao-obras-api

# Habilitar Cloud Run API
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Passo 2: Configurar Artifact Registry

```bash
# Criar repositório Docker
gcloud artifacts repositories create gestao-obras-api \
  --repository-format=docker \
  --location=us-central1

# Configurar Docker para autenticar
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Passo 3: Build e Push da Imagem

```bash
# Build da imagem Docker
docker build -t us-central1-docker.pkg.dev/gestao-obras-api/gestao-obras-api/gestao-obras-api:latest .

# Push para Artifact Registry
docker push us-central1-docker.pkg.dev/gestao-obras-api/gestao-obras-api/gestao-obras-api:latest
```

## Passo 4: Deploy no Cloud Run

```bash
# Deploy do serviço
gcloud run deploy gestao-obras-api \
  --image=us-central1-docker.pkg.dev/gestao-obras-api/gestao-obras-api/gestao-obras-api:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=sua-chave-aqui" \
  --memory=512Mi \
  --timeout=3600
```

O comando acima vai retornar a URL do seu serviço. Exemplo:
```
https://gestao-obras-api-abc123.us-central1.run.app
```

## Passo 5: Configurar no Frontend (APK)

1. Abra `.env.local` no seu projeto
2. Altere `VITE_API_URL` para a URL retornada:

```env
VITE_API_URL=https://gestao-obras-api-abc123.us-central1.run.app
GEMINI_API_KEY=sua-chave-api
NODE_ENV=production
```

3. Compilar web app:
```bash
npm run build:web
```

4. Sincronizar com Capacitor:
```bash
npx cap sync android
```

5. Build do APK:
```bash
cd android
./gradlew assembleRelease
```

O APK estará em: `android/app/build/outputs/apk/release/app-release.apk`

## Monitoramento

```bash
# Ver logs do serviço
gcloud run logs read gestao-obras-api --limit 50

# Ver detalhes do serviço
gcloud run services describe gestao-obras-api --region=us-central1
```

## Custos

- **Cloud Run**: Primeira 2M invocações/mês são gratuitas
- **Artifact Registry**: Primeiros 0.5 GB/mês são gratuitos
- **Recomendação**: Monitore os custos no Console do Google Cloud

## Troubleshooting

### Erro: "Build Failed"
- Verifique se o `Dockerfile` está correto
- Certifique-se que `npm ci` funciona localmente

### Erro: "Service Timeout"
- Aumentar `--timeout` no comando deploy
- Verificar se o backend está respondendo

### Erro: "GEMINI_API_KEY não funciona"
- Verifique se a chave é válida em https://aistudio.google.com
- Tente usar fallback (modo offline com estimativas pré-programadas)

## Alternativas Gratuitas

- **Heroku**: Camada gratuita limitada (descontinuada em 2023)
- **Railway**: $5/mês iniciais
- **Render**: Camada gratuita com sleep mode
- **Replit**: Hospedagem gratuita com limitações
