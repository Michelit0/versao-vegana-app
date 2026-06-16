# Checklist para mudancas com IA

Use este checklist antes de deixar qualquer IA mexer no projeto.

## Antes

- `git status` sem alteracoes importantes perdidas.
- `npm run protect:check` passando.
- `npm run backup:all` executado.
- Branch criada fora da `main`.
- Objetivo da mudanca escrito em uma frase.

## Durante

- Pedir alteracoes pequenas.
- Conferir arquivos modificados com `git diff`.
- Nao aceitar mudanca que mexe em `.env`, credenciais, migrations antigas ou exclusao de tabelas sem revisao.
- Testar a tela localmente antes de subir.

## Depois

- `npm run protect:check` passando.
- Conferencia visual no navegador.
- Commit descritivo.
- Push para GitHub.
- Deploy da Vercel validado.
- Tag estavel criada quando a versao estiver aprovada.

## Sinais de alerta

- IA quer apagar muitos arquivos.
- IA quer recriar o projeto do zero.
- IA muda nomes de tabelas/colunas sem migration.
- IA coloca chave secreta no codigo.
- IA ignora erros de build.
- IA altera regras de exclusao ou dados de producao sem backup.
