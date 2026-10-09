# App Júris — Especificação de Design

**Data:** 2026-10-09
**Estado:** Aprovado em conversa, aguarda revisão do documento

## 1. Objetivo

Aplicação web para gerir a marcação de júris. Uma administradora (gestora dos júris) cria júris com um intervalo de tempo possível; os formadores envolvidos indicam as suas disponibilidades em blocos de 30 minutos; a app mostra de forma visual e imediata as disponibilidades de todos e sugere as melhores datas para marcar.

**Critérios de sucesso**
- A administradora cria um júri e envia os links em poucos minutos, sem ajuda técnica.
- Um formador preenche disponibilidades num telemóvel em menos de 2 minutos, sem login.
- A administradora vê de imediato a melhor data (ou fica claramente avisada de que não existe data com todos).
- Custo de alojamento: 0 €.

## 2. Âmbito

**Incluído (v1)**
- Login da administradora (email + password).
- Gestão de formadores (nome, área em texto livre, ativo/inativo, link pessoal).
- Gestão de júris (criar, editar, marcar, cancelar).
- Link pessoal por formador com lista de júris pendentes/preenchidos/marcados.
- Grelha de disponibilidade estilo When2Meet (arrastar para pintar), blocos de 30 min.
- Mapa de calor (cor + contagem "3/5", nomes em hover/toque) visível para administradora e formadores.
- Sugestão automática das melhores datas, com aviso quando não há data com todos.
- Partilha de links via "Copiar" e "Enviar por WhatsApp" (wa.me com mensagem pré-preenchida).

**Excluído (possível fase 2)**
- Envio de emails (convites, lembretes, confirmação).
- Múltiplas contas de administração.
- Histórico/auditoria, exportações.

## 3. Arquitetura

- **Frontend:** React + Vite + TypeScript, SPA estática alojada na **Vercel** (plano Hobby).
- **Backend:** **Firebase** (plano Spark, gratuito) — Firestore + Firebase Auth. Sem Cloud Functions (não disponíveis no Spark); toda a autorização é feita por Firestore Security Rules.
- **Repositório:** GitHub.
- **Fuso horário:** tudo em hora de Lisboa, guardado como string local `"YYYY-MM-DDTHH:mm"` (sem conversões UTC).

Nota: os termos do plano Hobby da Vercel referem uso não comercial. Como a app é um site estático, a migração para Firebase Hosting é trivial se necessário.

## 4. Modelo de dados (Firestore)

### `formadores/{token}`
O ID do documento é o **token secreto** do link (≥ 24 caracteres aleatórios, alfabeto URL-safe, gerado com `crypto.getRandomValues`).

| Campo | Tipo | Notas |
|---|---|---|
| `pid` | string | ID público aleatório (≥ 16 chars), usado em júris e disponibilidades |
| `nome` | string | |
| `area` | string | Texto livre, editável pela administradora |
| `ativo` | boolean | |
| `criadoEm` | timestamp | |

A administradora obtém o token de um `pid` lendo a coleção `formadores` (tem acesso total).

### `juris/{id}`
| Campo | Tipo | Default |
|---|---|---|
| `titulo` | string | |
| `notas` | string | `""` |
| `dataInicio`, `dataFim` | string `YYYY-MM-DD` | |
| `horaInicio`, `horaFim` | string `HH:mm` | `09:00`, `19:00` |
| `diasSemana` | number[] (1=seg … 7=dom) | `[1,2,3,4,5]` |
| `duracaoMin` | number (múltiplo de 30) | `60` |
| `participantes` | map `{pid: nome}` | |
| `participantesIds` | string[] — espelho das chaves de `participantes` (para queries `array-contains` e regras) | |
| `estado` | `"aberto" \| "marcado" \| "cancelado"` | `"aberto"` |
| `dataMarcada` | string `YYYY-MM-DDTHH:mm` \| null | `null` |
| `criadoEm`, `atualizadoEm` | timestamp | |

### `juris/{id}/disponibilidades/{pid}`
| Campo | Tipo |
|---|---|
| `slots` | string[] — inícios de blocos de 30 min, ex. `"2026-10-14T10:00"` |
| `atualizadoEm` | timestamp |

### `sessoes/{uid}`
Liga uma sessão anónima Firebase a um formador.
| Campo | Tipo |
|---|---|
| `token` | string |
| `pid` | string |

## 5. Autenticação e segurança

**Administradora:** Firebase Auth email/password. O seu UID é fixo nas regras (constante `ADMIN_UID`). Acesso total de leitura/escrita.

**Formador:**
1. Abre `/f/{token}`.
2. A app faz `signInAnonymously()` (invisível para o utilizador).
3. Lê `formadores/{token}` (get permitido, list proibido) e obtém `pid`.
4. Cria/atualiza `sessoes/{uid}` com `{token, pid}`. A regra só permite se `formadores/{token}` existir, estiver `ativo` e `pid` coincidir.
5. A partir daí, as regras usam `get(/sessoes/{request.auth.uid})` para saber o `pid` da sessão.

**Regras (resumo):**
- `formadores/{token}`: `get` público; `list`/`write` só admin.
- `sessoes/{uid}`: `create/update` só pelo próprio `uid`, com validação acima; `read` só pelo próprio `uid` ou admin.
- `juris/{id}`: admin total; formador pode `get`/`list` júris onde o seu `pid` ∈ `participantesIds` (query `where('participantesIds', 'array-contains', pid)`).
- `juris/{id}/disponibilidades/{pid}`: leitura por admin ou por qualquer participante do júri; escrita só se `sessao.pid == pid`, `pid ∈ participantesIds` e `juri.estado == "aberto"`; `slots` validado como lista (tamanho máximo razoável, ex. ≤ 2000).
- Nenhum documento legível por formadores contém tokens.

**Rotação de link:** a administradora pode "gerar novo link" — cria novo documento `formadores/{novoToken}` com o mesmo `pid` e apaga o antigo. Sessões antigas deixam de validar (as regras de escrita verificam que o token da sessão ainda existe e está ativo).

## 6. Ecrãs

### Administradora (rotas protegidas)
1. **`/login`** — email + password; sessão persistente.
2. **`/` Painel de júris** — cartões: título, intervalo, progresso "Responderam X/Y", melhor data atual, estado. Filtro por estado. Botão "+ Novo júri".
3. **`/juris/novo`, `/juris/:id/editar`** — formulário com defaults; seleção de formadores com pesquisa (nome + área). Ao reduzir o intervalo/horário com respostas existentes, mostra aviso de que blocos fora do novo intervalo serão ignorados.
4. **`/juris/:id` Detalhe** — 
   - Sugestões (top 5) com botão "Marcar"; aviso "⚠️ Não há nenhuma data com todos" e quem falta em cada sugestão.
   - Grelha mapa de calor (cor por proporção, contagem, nomes em hover/toque).
   - Lista "Quem falta responder" com Copiar link / WhatsApp.
   - Ações: Editar, Cancelar, Reabrir; marcar também por clique num bloco da grelha.
   - Atualização em tempo real (`onSnapshot`).
5. **`/formadores`** — lista, adicionar/editar (nome, área), ativar/desativar, Copiar link, WhatsApp, Gerar novo link.

### Formador (`/f/:token`, sem login visível)
1. **Início** — "Olá, {nome}"; secções: *Por preencher*, *Já preenchidos* (editáveis enquanto abertos), *Marcados* (data confirmada), *Cancelados* ocultos.
2. **`/f/:token/juri/:id`** — grelha só com o intervalo/horário/dias do júri; arrastar (rato ou toque) para pintar/despintar; mapa de calor dos outros em tom suave por baixo; auto-gravação com debounce ~500 ms e indicador "Guardado ✓"; em mobile mostra 3 dias por vez com setas.
3. Erros: token inexistente → "Este link não é válido"; formador inativo → "Este link já não está ativo"; júri não aberto → só leitura.

## 7. Algoritmo de sugestões

Função pura `sugerirDatas(juri, disponibilidades): Resultado`.

1. **Gerar blocos:** para cada dia em `[dataInicio, dataFim]` cujo dia da semana ∈ `diasSemana`, blocos de 30 min de `horaInicio` até `horaFim` (exclusivo).
2. **Candidatos:** cada bloco inicial tal que os `duracaoMin/30` blocos consecutivos cabem no mesmo dia antes de `horaFim`.
3. **Pontuação:** para cada candidato, conjunto de `pid` (apenas participantes atuais) disponíveis em todos os blocos ocupados.
4. **Ordenação:** número de disponíveis desc., depois data/hora asc.
5. **Desduplicação:** descartar um candidato se se sobrepuser no tempo a um já escolhido com o mesmo conjunto de disponíveis.
6. **Saída:** top 5 com `{inicio, fim, disponiveis[], emFalta[]}`, flag `haDataComTodos`, e `semRespostas` se ninguém respondeu.

Disponibilidades de `pid` que já não estão em `participantes` e slots fora da grelha atual são ignorados.

## 8. Casos limite

- Formador removido de um júri → disponibilidade ignorada (doc pode permanecer).
- Formador inativo → link mostra mensagem; não pode escrever (regra de sessão falha).
- Júri marcado/cancelado → formador em modo leitura.
- Alteração de datas com respostas → aviso antes de gravar; slots fora são ignorados.
- Sem rede → aviso e nova tentativa de gravação.
- Duração não múltipla de 30 → input só permite múltiplos de 30 (30–240).

## 9. Testes

- **Unitários (Vitest):** geração de blocos, candidatos, `sugerirDatas` (todos disponíveis, nenhum com todos, empates, desduplicação, participantes removidos, slots fora da grelha, sem respostas).
- **Regras Firestore (`@firebase/rules-unit-testing` + emulador):** formador não lê/lista outros formadores; não escreve disponibilidade de outro `pid`; não escreve em júri não aberto; não lê júris onde não participa; sessão com token inválido/inativo é recusada; admin tem acesso total.
- **Componentes (Vitest + Testing Library):** pintura por arrastar na grelha.
- **Verificação manual no browser** dos fluxos principais (desktop e mobile).

## 10. Estrutura proposta do projeto

```
app_juris/
  src/
    lib/            # firebase init, tokens, tipos
    domain/         # slots.ts, sugestoes.ts (puros, testados)
    data/           # acesso Firestore (hooks)
    components/     # GrelhaDisponibilidade, MapaCalor, ...
    pages/admin/    # Painel, JuriForm, JuriDetalhe, Formadores, Login
    pages/formador/ # Inicio, PreencherJuri
  firestore.rules
  tests/rules/
  firebase.json     # só para emuladores e deploy de regras
```
