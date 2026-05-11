# Anvil — Framework UI do FORGE

Anvil (Advanced Networked Virtual Infrastructure Layer) e o framework frontend proprio do FORGE.
Vanilla JS puro, sem bundler, sem dependencias externas.

## Principios

- Zero dependencias — apenas ES Modules nativos do browser
- Separacao clara entre logica (model), DOM (view) e HTTP (service)
- Estado reativo simples via createStore
- Helpers DOM centralizados em dom.js — nunca repetir querySelector inline
- Testabilidade — logica em *.model.js nao toca o DOM

## Estrutura de arquivos

```
lib/
  anvil/
    dom.js        — helpers DOM (qs, qsa, show, hide, on, cloneTemplate, etc)
    state.js      — gerenciador de estado reativo (createStore)
    element.js    — helpers genéricos para criação de elementos (el, append)
  ui/
    builders.js   — componentes UI do projeto (buildSummary, buildTable)
    modal.js      — utilitarios de modal reutilizaveis
    tabs.js       — componente de abas reutilizavel
    clipboard.js  — botao copiar
  format.js       — formatacao de dados (bytes, etc) — sem DOM
  ws.js           — wrapper WebSocket com reconexao automatica — sem DOM
```

### Separacao de responsabilidades

| Camada | Onde | Criterio |
|---|---|---|
| Anvil core | lib/anvil/ | Primitivos genericos, sem opiniao sobre CSS do projeto |
| UI do projeto | lib/ui/ | Usa classes CSS do FORGE (forge-table, info-summary, etc) |
| Utilitarios puros | lib/ | Sem DOM, sem CSS |

## Convencoes de sufixo

| Sufixo | Conteudo | Testavel |
|---|---|---|
| *.model.js | Logica pura, sem DOM | Sim |
| *.view.js | Manipulacao DOM, renderizacao | Nao |
| *.service.js | Chamadas HTTP/WS | Com mock |
| sem sufixo | Utilitarios genericos | Depende |

## Regras de uso

- Nunca usar `document.querySelector` ou `addEventListener` diretamente nas features — sempre via `dom.js`
- Nunca usar `innerHTML` para renderizar listas ou componentes — usar `cloneTemplate` + `appendChild`
- `innerHTML` permitido apenas para strings simples de loading/erro em `openModal`
- Funcoes que retornam elementos DOM devem retornar `HTMLElement` ou `DocumentFragment`, nunca string HTML
- Ao appendar `DocumentFragment`, guardar referencias dos elementos filho ANTES do `appendChild`
- `buildTable` e `buildSummary` aceitam `Node` nas celulas — nunca passar HTML como string

## Padrao de componente

Todo componente que gerencia estado proprio deve:
1. Criar um store com createStore
2. Expor funcoes de inicializacao (init*) e renderizacao (render*)
3. Separar logica de calculo (model) da renderizacao (view)

## Exemplo

```js
// deploy.model.js — logica pura, testavel
export function buildDeployPlan(disk, iso, pos) { ... }
export function validatePlan(plan) { ... }

// deploy.view.js — DOM, nao testavel
import { buildDeployPlan } from "./deploy.model.js";
import { qs, on } from "../../lib/anvil/dom.js";
export function initDeployView(store) { ... }
```

## Roadmap Anvil

- [x] Fase 1: dom.js + state.js + documentacao
- [x] Fase 2: migracao de todos os arquivos JS para dom.js
- [x] Fase 2+: reorganizacao lib/ em anvil/, ui/ e utilitarios puros
- [x] Fase 2+: element.js (el, append) e builders.js (buildSummary, buildTable)
- [ ] Fase 3: componente base com state + render + mount
- [ ] Fase 4: componentes de deploy (progresso, log, etapas)