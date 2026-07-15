# 🚀 GUIA RÁPIDO - Deploy Backend + APK (5 min)

## Passo 1: Criar Conta Google Cloud (2 min)

1. Acesse: https://console.cloud.google.com
2. Clique em **"Criar Projeto"**
3. Nome: `gestao-obras-api`
4. Clique em **"Criar"**

---

## Passo 2: Habilitar APIs (1 min)

No terminal, execute:

```bash
gcloud auth login
gcloud config set project gestao-obras-api
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

---

## Passo 3: Deploy do Backend (2 min)

```bash
# Copie e cole no terminal:
gcloud run deploy gestao-obras-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=sua-chave-aqui" \
  --memory 512Mi \
  --timeout 3600
```

**Vai aparecer uma URL assim:**
```
https://gestao-obras-api-xxxx.us-central1.run.app
```

**COPIE ESSA URL!** ☝️

---

## Passo 4: Configurar APK (1 min)

1. Abra `.env.local` no seu projeto
2. Altere para:

```env
VITE_API_URL=https://gestao-obras-api-xxxx.us-central1.run.app
GEMINI_API_KEY=sua-chave-aqui
NODE_ENV=production
```

(Substitua `xxxx` pelo seu ID)

---

## Passo 5: Fazer Push (Git commit)

```bash
git add -A
git commit -m "Configure cloud backend"
git push origin main
```

---

## Passo 6: GitHub Actions vai fazer o resto!

1. Acesse: https://github.com/pedrodvp2e/Gest-o-de-Obras-beta/actions
2. Veja o workflow rodando
3. Aguarde 5-10 minutos
4. **Clique na última execução**
5. **Desça e clique em "Artifacts"**
6. **Baixe `app-release.apk`**

---

## Passo 7: Instalar no Android

1. Transfira o APK para seu celular (WhatsApp, email, etc)
2. Abra o arquivo
3. Clique em "Instalar"
4. Se pedir permissão: Configurações → Segurança → Instalar apps desconhecidos
5. **Pronto!** ✅

---

## 🧪 Testar o App

**Login:**
- User: `engenheiro`
- Senha: `123`

Ou:
- User: `mestre`
- Senha: `123`

---

## ❓ Problemas?

### "Erro no deploy"
- Verifique se habilitou as APIs
- Tente novamente:
```bash
gcloud run deploy gestao-obras-api --source .
```

### "APK não conecta"
- Copie a URL corretamente em `.env.local`
- Reinicie o app
- Verifique sua conexão de internet

### "Build do GitHub Actions falhou"
- Verifique os logs em Actions
- Tente fazer outro push

---

## 🎉 Pronto!

Seu app está rodando na nuvem e instalável no Android! 🚀
