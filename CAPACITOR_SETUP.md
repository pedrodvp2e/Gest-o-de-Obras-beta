# 📱 Capacitor Setup - Guia de Configuração

## O que foi feito?

Seu app React foi configurado para ser compilado como um app Android nativo (.apk) usando **Capacitor**.

## 📋 Arquivos adicionados:

1. **capacitor.config.ts** - Configuração do Capacitor
2. **.github/workflows/build-apk.yml** - GitHub Actions para compilar automaticamente
3. **package.json** - Atualizado com dependências do Capacitor

---

## 🚀 Como usar:

### Opção 1: Compilar na Nuvem (Recomendado - Sem PC)

1. **Faça merge desta branch para `main` ou `master`**
2. **GitHub Actions vai compilar automaticamente**
3. **Acesse a aba `Actions` no seu repositório**
4. **Baixe o arquivo `.apk` gerado**

#### Passo a passo:
```bash
# No seu terminal local:
git checkout capacitor-setup
git pull origin capacitor-setup
git checkout main
git merge capacitor-setup
git push origin main
```

Depois, vá em: https://github.com/pedrodvp2e/Gest-o-de-Obras-beta/actions

---

### Opção 2: Compilar Localmente (Com PC)

Se você tiver um PC com Android SDK:

```bash
# 1. Instale as dependências
npm install

# 2. Compile o app web
npm run build:web

# 3. Adicione Android (primeira vez)
npx cap add android

# 4. Sincronize os arquivos
npx cap sync android

# 5. Abra no Android Studio
npx cap open android

# 6. Compile (no Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s))
```

---

## 📥 Instalando o APK no seu Android:

1. **Baixe o arquivo `.apk`** do GitHub Actions
2. **Transfira para seu Android** (via USB ou email)
3. **Abra o arquivo** e clique em "Instalar"
4. **Permita instalação de fontes desconhecidas** (se pedido)
5. **Pronto!** 🎉

---

## ⚙️ Configurações:

**Nome do app:** Gestão de Obras  
**Package ID:** com.gestaoobras.app  
**Build type:** Release (otimizado para distribuição)

---

## 🔧 Troubleshooting:

### Build falhou no GitHub Actions?
- Verifique se o `package.json` foi atualizado
- Tente fazer push novamente
- Verifique os logs em `Actions`

### APK não instala?
- Certifique-se que seu Android permite "Instalação de fontes desconhecidas"
- Tente desinstalar versões anteriores
- Verifique o espaço disponível no celular

### Erro de API Key (Gemini)?
- Configure a variável `GEMINI_API_KEY` no seu app ou `.env`
- Para build Android, pode precisar colocar a chave diretamente no código (não recomendado em produção)

---

## 📝 Próximos passos:

1. ✅ Faça merge desta branch
2. ✅ Aguarde o GitHub Actions compilar
3. ✅ Baixe o `.apk`
4. ✅ Instale no seu Android
5. ✅ Teste o app!

---

**Precisa de ajuda?** Revise os logs do GitHub Actions ou entre em contato! 🚀
