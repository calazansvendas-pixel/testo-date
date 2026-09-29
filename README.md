# testo-date

PWA pessoal para registrar aplicações, acompanhar o intervalo sugerido de 10 dias corridos e manter um histórico privado no Cloud Firestore.

## Desenvolvimento

1. Copie `.env.example` para `.env` e preencha as credenciais do app Web no Firebase Console e o e-mail Google autorizado.
2. Ative o provedor Google em Authentication e crie o banco Cloud Firestore.
3. Instale as dependências com `npm install`.
4. Inicie o app com `npm run dev`.

As regras do banco estão em `firestore.rules`. Publique-as pelo Firebase Console ou execute `npx firebase-tools deploy --only firestore:rules` depois de configurar a Firebase CLI.

## Segurança e dados

O app requer a conta Google informada em `VITE_AUTHORIZED_EMAIL`. As regras em `firestore.rules` devem conter o mesmo e-mail autorizado, exigir e-mail verificado e restringir cada caminho ao UID autenticado. O documento contém `id`, `dataHora` ISO, `status`, `observacao` e `dataCriacao`.

As credenciais `VITE_FIREBASE_*` identificam o projeto e são públicas no bundle do navegador. A privacidade dos dados depende de Authentication e das regras do Firestore, nunca de manter a API key secreta.

## Offline e diagnóstico

O Firestore usa cache persistente IndexedDB com suporte a múltiplas abas; se o navegador não permitir essa inicialização, o SDK tenta o cache em memória. Quando a consulta remota falha (por exemplo, banco inexistente ou `permission-denied`), o app informa o estágio/código do erro e permite continuar com `localStorage`.

Registros salvos no modo local ficam somente naquele navegador e não são enviados automaticamente ao Firestore. O app os mantém visíveis quando a nuvem volta, identificando-os como locais; exporte-os manualmente antes de limpar os dados do navegador. Erros de retorno do Google indicam verificações para provedor e domínio autorizado, além do detalhe técnico no console e na tela.

## Lembretes

O som e a notificação de vencimento são tentados somente enquanto o app está aberto e visível. Navegadores e sistemas móveis podem suspender timers, bloquear áudio ou atrasar notificações; não há garantia de execução no horário exato em segundo plano. Web Push agendado exige infraestrutura de envio no servidor e continua sujeito às políticas de entrega da plataforma.

## Verificações

- `npm test`: testes da soma de dias de calendário e formatação da data local.
- `npm run build`: compilação Vite e geração dos arquivos PWA.

## Deploy na Vercel

Use o diretório raiz deste projeto, comando de build `npm run build` e diretório de saída `dist`. Configure no painel da Vercel todas as variáveis de `.env.example`. Na Firebase Console, adicione o domínio de produção aos domínios autorizados do Authentication e publique `firestore.rules`.
