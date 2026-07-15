# 📱 Guia de Build para Android APK

## Pré-requisitos

✅ Java 17 ou superior  
✅ Android SDK instalado  
✅ Gradle  
✅ Node.js 18+  

## Passo 1: Preparar o Projeto

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Editar .env.local com sua configuração
# VITE_API_URL = URL do seu backend em nuvem
# GEMINI_API_KEY = sua chave Gemini (opcional)
```

## Passo 2: Build Web

```bash
# Compilar aplicação web
npm run build:web

# Verificar se dist/ foi criado
ls -la dist/
```

## Passo 3: Adicionar Plataforma Android

```bash
# Primeira vez: adicionar Android
npx cap add android

# Sempre: sincronizar arquivos
npx cap sync android
```

## Passo 4: Abrir no Android Studio

```bash
# Abrir projeto Android Studio
npx cap open android
```

Ou abra manualmente:
```
android/
```

## Passo 5: Build do APK

### Opção A: Modo Release (Recomendado)

```bash
cd android
./gradlew assembleRelease
```

APK gerado em:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Opção B: Modo Debug (Desenvolvimento)

```bash
cd android
./gradlew assembleDebug
```

APK gerado em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Passo 6: Instalar no Device

```bash
# Conectar device via USB
# Habilitar Debug USB (Configurações > Desenvolvimento)

# Instalar APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Ou via Android Studio: Run > Run 'app'
```

## Assinatura Digital (Para Play Store)

```bash
# Gerar chave de assinatura (primeira vez)
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Configurar em android/app/build.gradle:
# signingConfigs {
#   release {
#     storeFile file('my-release-key.jks')
#     storePassword = ...
#     keyAlias = 'my-key-alias'
#     keyPassword = ...
#   }
# }

# Build assinado
./gradlew assembleRelease
```

## Troubleshooting

### Erro: "No Android SDK found"
```bash
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk  # macOS
# ou
export ANDROID_SDK_ROOT=/home/$USER/Android/Sdk   # Linux
```

### Erro: "Gradle build failed"
```bash
# Limpar build
cd android && ./gradlew clean
cd ..
npx cap sync android
cd android && ./gradlew assembleRelease
```

### Erro: "API mismatch"
- Verifique `android/app/build.gradle`
- Altere `compileSdkVersion` e `targetSdkVersion` para 34+

### Backend não conecta
- Verifique `VITE_API_URL` em `.env.local`
- Teste em modo debug primeiro
- Verif ique se o device consegue acessar a URL (tente no navegador)

## Próximas Etapas

1. ✅ Testar no device/emulador
2. ✅ Distribuir arquivo `.apk` para usuários
3. ✅ (Opcional) Fazer upload para Google Play Store
