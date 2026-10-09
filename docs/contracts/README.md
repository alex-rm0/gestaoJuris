# Contratos

Um contrato é a fonte de verdade de uma funcionalidade, independente da tecnologia. O código implementa-o.

Caminho: `docs/contracts/<dominio>/<funcionalidade>.md`

## Template

```markdown
---
id: <dominio>/<funcionalidade>
product: <dominio>
status: mock | live
---

# <Título>

## 1. Modelo de dados
Entidades, campos, tipos, relações.

## 2. Operações
Para cada operação: quem pode, entradas, saídas, erros.

## 3. Regras de negócio
Cada regra com âncora estável `<PREFIXO>-Rnn` (nunca renumerada nem reutilizada).

## 4. Comportamento da UI
Ecrãs, transições, estados de carregamento / vazio / erro.
```
