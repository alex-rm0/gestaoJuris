# App Júris

Marcação de júris: a administradora cria júris e partilha links pessoais; os formadores marcam disponibilidades em blocos de 30 min; a app mostra um mapa de calor e sugere as melhores datas.

- Spec: `docs/superpowers/specs/2026-10-09-app-juris-design.md`
- Contrato: `docs/contracts/juris/marcacao-juris.md`

## Desenvolvimento local

Requisitos: Node 20+, Java 11+ (para os emuladores Firebase).

```bash
npm install
cp .env.example .env.local
npm run emu          # terminal 1: emuladores Auth + Firestore (UI em http://127.0.0.1:4000)
npm run seed:emu     # terminal 2: cria a conta de administração local
npm run dev          # terminal 2: app em http://localhost:5173
```

Testes:

```bash
npm test             # unitários
npm run test:emu     # regras de segurança e camada de dados (arranca o emulador)
```

## Produção (Firebase Spark + Vercel Hobby, 0 €)

1. **Firebase** (consola): criar projeto → *Authentication* → ativar **Email/Password** e **Anónimo** → criar o utilizador da administradora (copiar o UID).
2. *Firestore Database* → criar base de dados (localização na Europa, ex. `eur3`) → criar documento `admins/<UID da administradora>` (sem campos ou com `nota: "admin"`).
3. *Definições do projeto* → adicionar app Web → copiar `apiKey`, `authDomain`, `projectId`, `appId`.
4. Publicar as regras: `npx firebase login` e `npx firebase deploy --only firestore:rules --project <projectId>`.
5. **Vercel**: importar o repositório do GitHub (framework Vite) → variáveis de ambiente `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_USE_EMULATOR=false` → deploy.
6. Firebase → *Authentication* → *Settings* → *Authorized domains* → adicionar o domínio da Vercel.

Sempre que `firestore.rules` mudar, repetir o passo 4.
