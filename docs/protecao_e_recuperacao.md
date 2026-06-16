# Protecao e recuperacao do projeto

Este documento define a rotina de seguranca do sistema Versao Vegana para evitar perda de codigo, dados e configuracoes quando houver mudancas manuais ou com IA.

## Regra principal

`main` representa producao estavel. Mudancas novas devem nascer em uma branch de trabalho, ser testadas, commitadas e so depois ir para `main`.

## Rotina antes de pedir alteracoes para uma IA

1. Conferir se a producao esta funcionando.
2. Rodar `npm run protect:check`.
3. Rodar `npm run backup:all`.
4. Criar uma branch de trabalho com `git checkout -b ajuste/nome-curto`.
5. Fazer a alteracao.
6. Rodar novamente `npm run protect:check`.
7. Conferir visualmente no sistema local.
8. Fazer commit pequeno e descritivo.
9. Subir para o GitHub.

## Pontos de restauracao

Use tags para marcar momentos confiaveis:

```powershell
git tag stable-AAAA-MM-DD-descricao
git push origin stable-AAAA-MM-DD-descricao
```

Para voltar o codigo para uma versao estavel:

```powershell
git checkout stable-AAAA-MM-DD-descricao
npm install
npm run build
```

## Backups

Codigo:

```powershell
npm run backup:code
```

Banco:

```powershell
npm run backup:supabase
```

Codigo + banco:

```powershell
npm run backup:all
```

Use `BACKUP_DIR` para mandar os arquivos para uma pasta sincronizada em nuvem:

```powershell
$env:BACKUP_DIR="C:\Users\micha\OneDrive\Backups\versao-vegana"
npm run backup:all
```

## O que cada camada protege

GitHub protege codigo, historico de commits, migrations SQL e documentacao.

Tags protegem versoes estaveis conhecidas, como "antes de uma grande alteracao".

Backups do Supabase protegem dados reais do negocio: clientes, pedidos, compras, receitas, atividades e historicos.

Backups `.zip` protegem uma copia portatil do codigo, util quando o computador ou ambiente local fica baguncado.

Vercel protege deploys anteriores com rollback visual pelo painel, mas nao substitui GitHub nem backup do banco.

## Arquivos sensiveis

Nunca subir `.env`, senhas, tokens, service role key, dumps reais ou backups de dados para repositorio publico.

O arquivo `.env.example` deve manter somente nomes das variaveis, sem valores reais.

## Frequencia recomendada

Antes de mudancas grandes: `npm run backup:all`.

Depois de deploy aprovado: criar tag estavel.

Diariamente ou semanalmente: backup do Supabase em pasta sincronizada na nuvem.

Mensalmente: testar restauracao em uma pasta separada para garantir que o backup presta.

## Restauracao rapida

Se uma alteracao quebrar o projeto local:

```powershell
git status
git log --oneline -5
git checkout main
npm install
npm run protect:check
```

Se a `main` tambem estiver ruim, use a ultima tag estavel:

```powershell
git tag --sort=-creatordate
git checkout stable-AAAA-MM-DD-descricao
npm install
npm run protect:check
```

Se o problema for nos dados, restaure usando o backup mais recente do Supabase ou importe os arquivos JSON em um banco de homologacao antes de mexer na producao.
