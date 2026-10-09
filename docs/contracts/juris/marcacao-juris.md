---
id: juris/marcacao-juris
product: juris
status: mock
---

# Marcação de Júris

Design detalhado: `docs/superpowers/specs/2026-10-09-app-juris-design.md`.

## 1. Modelo de dados

### Formador
| Campo | Tipo | Notas |
|---|---|---|
| token | string secreta (≥ 24 chars URL-safe) | Identifica o link pessoal; chave primária |
| pid | string pública (≥ 16 chars) | Identificador usado em júris e disponibilidades |
| nome | string não vazia | |
| area | string | Texto livre, pode ser vazio |
| ativo | boolean | |
| criadoEm | data/hora | |

### Júri
| Campo | Tipo | Default |
|---|---|---|
| id | string | gerado |
| titulo | string não vazia | |
| notas | string | `""` |
| dataInicio, dataFim | data `YYYY-MM-DD` | |
| horaInicio, horaFim | hora `HH:mm`, múltiplos de 30 min | `09:00`, `19:00` |
| diasSemana | conjunto de 1..7 (1 = segunda) | `{1,2,3,4,5}` |
| duracaoMin | inteiro, múltiplo de 30, 30–240 | `60` |
| participantes | mapa pid → nome | |
| participantesIds | lista de pid (= chaves de participantes) | |
| estado | `aberto` \| `marcado` \| `cancelado` | `aberto` |
| dataMarcada | data/hora local `YYYY-MM-DDTHH:mm` ou nulo | nulo |
| criadoEm, atualizadoEm | data/hora | |

### Disponibilidade (1 por júri × participante)
| Campo | Tipo |
|---|---|
| juriId, pid | chave composta |
| slots | conjunto de inícios de bloco de 30 min `YYYY-MM-DDTHH:mm` |
| atualizadoEm | data/hora |

### Sessão de formador
| Campo | Tipo |
|---|---|
| sessaoId | identificador da sessão anónima |
| token, pid | formador associado |

### Sugestão (derivada, não persistida)
`{ inicio, fim, disponiveis: pid[], emFalta: pid[] }`

## 2. Operações

Atores: **Admin** (administradora autenticada), **Formador** (sessão anónima ligada a um token), **Anónimo** (sem sessão).

| Operação | Ator | Entrada | Saída | Erros |
|---|---|---|---|---|
| entrarAdmin | Anónimo | email, password | sessão Admin | credenciais inválidas |
| sairAdmin | Admin | — | — | — |
| listarFormadores | Admin | — | Formador[] | — |
| criarFormador | Admin | nome, area | Formador (token e pid gerados) | nome vazio |
| editarFormador | Admin | token, nome?, area?, ativo? | Formador | inexistente; nome vazio |
| regenerarLink | Admin | token | novo token (mesmo pid) | inexistente |
| listarJuris | Admin | filtro estado? | Júri[] | — |
| criarJuri | Admin | campos do Júri, lista de pid | Júri | validação (JU-R04..R07) |
| editarJuri | Admin | id, campos | Júri | inexistente; validação |
| marcarJuri | Admin | id, inicio | Júri (marcado) | inicio fora da grelha (JU-R12) |
| cancelarJuri / reabrirJuri | Admin | id | Júri | inexistente |
| verDisponibilidades | Admin; Formador participante | juriId | Disponibilidade[] | sem acesso |
| sugerirDatas | qualquer com acesso ao júri | Júri, Disponibilidade[] | `{ sugestoes[≤5], haDataComTodos, semRespostas }` | — |
| abrirLink | Anónimo | token | sessão Formador + Formador {nome, pid} | token inválido; formador inativo |
| listarJurisDoFormador | Formador | — | Júri[] onde participa | — |
| guardarDisponibilidade | Formador | juriId, slots | Disponibilidade | não participante; júri não aberto; slots inválidos |

## 3. Regras de negócio

- **JU-R01** — Só a conta Admin configurada tem acesso de gestão (formadores, júris, marcação).
- **JU-R02** — Um token só pode ser obtido individualmente por quem o conhece; a lista de formadores/tokens nunca é exposta a não-Admin.
- **JU-R03** — Nenhum dado legível por um Formador contém o token de outro formador.
- **JU-R04** — `dataInicio ≤ dataFim`.
- **JU-R05** — `horaInicio < horaFim`, ambos múltiplos de 30 min, e `horaFim − horaInicio ≥ duracaoMin`.
- **JU-R06** — `duracaoMin` é múltiplo de 30, entre 30 e 240.
- **JU-R07** — Um júri tem pelo menos 1 participante e pelo menos 1 dia da semana.
- **JU-R08** — Um Formador só pode escrever a sua própria disponibilidade (pid da sessão), em júris onde é participante, e só com o júri `aberto`.
- **JU-R09** — Um Formador só pode ler júris (e as respetivas disponibilidades) onde é participante.
- **JU-R10** — Formador inativo ou token inexistente/regenerado: a sessão não é aceite e não pode escrever.
- **JU-R11** — A grelha de um júri são os blocos de 30 min de `horaInicio` (incl.) a `horaFim` (excl.), nos dias de `[dataInicio, dataFim]` cujo dia da semana ∈ `diasSemana`.
- **JU-R12** — Um início candidato é válido se os `duracaoMin/30` blocos consecutivos pertencem à grelha no mesmo dia.
- **JU-R13** — Um participante está disponível num candidato se tem todos os blocos ocupados pelo candidato nos seus slots.
- **JU-R14** — Sugestões ordenadas por nº de disponíveis (desc.), depois início (asc.); um candidato é descartado se sobrepõe no tempo a um já escolhido com o mesmo conjunto de disponíveis; máximo 5.
- **JU-R15** — `haDataComTodos` é verdadeiro sse existe candidato com todos os participantes; caso contrário a UI mostra aviso explícito e quem falta em cada sugestão.
- **JU-R16** — `semRespostas` é verdadeiro se nenhum participante atual tem slots na grelha; nesse caso não há sugestões.
- **JU-R17** — Disponibilidades de pid fora dos participantes atuais e slots fora da grelha atual são ignorados (não apagados).
- **JU-R18** — Todas as datas/horas são hora local de Lisboa, sem conversão de fuso.
- **JU-R19** — Marcar define `estado = marcado` e `dataMarcada`; cancelar define `cancelado`; reabrir volta a `aberto` e limpa `dataMarcada`.
- **JU-R20** — Regenerar link invalida o token anterior e mantém o pid (disponibilidades preservadas).
- **JU-R21** — Um participante "respondeu" a um júri se tem pelo menos 1 slot na grelha atual.

## 4. Comportamento da UI

### Admin
- **Login** — erro inline para credenciais inválidas; sessão persiste entre visitas.
- **Painel** — cartões de júri (título, intervalo, "Responderam X/Y", melhor sugestão ou "Ainda sem respostas", estado). Vazio: "Ainda não há júris" + botão criar. Filtro por estado.
- **Formulário de júri** — defaults pré-preenchidos; validação inline (JU-R04..R07); seleção de formadores com pesquisa por nome/área. Ao alterar datas/horário de um júri com respostas, aviso de que blocos fora serão ignorados (JU-R17).
- **Detalhe do júri** — sugestões no topo com botão "Marcar"; aviso "⚠️ Não há nenhuma data com todos" (JU-R15); grelha mapa de calor (intensidade ∝ disponíveis/total, contagem "X/Y", nomes em hover/toque); clique num bloco permite marcar; lista "Quem falta responder" com Copiar link / WhatsApp; ações Editar, Cancelar, Reabrir. Atualiza em tempo real.
- **Formadores** — lista com nome, área, estado; adicionar/editar; ativar/desativar; Copiar link; WhatsApp (mensagem pré-preenchida com o link); Gerar novo link (com confirmação).

### Formador
- **Início (`/f/:token`)** — "Olá, {nome}"; secções Por preencher, Já preenchidos, Marcados (com data). Vazio: "Não tens júris pendentes".
- **Preencher júri** — grelha do júri; arrastar para pintar/despintar (rato e toque); mapa de calor dos outros em tom suave; auto-gravação ~500 ms após última alteração com estado "A guardar…" / "Guardado ✓" / "Sem ligação — a tentar de novo". Júri não aberto → só leitura com mensagem. Mobile: 3 dias visíveis com setas.
- **Erros** — token inválido: "Este link não é válido". Formador inativo: "Este link já não está ativo". Carregamento: indicador simples.
