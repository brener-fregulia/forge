# Anvil — Framework UI do FORGE

Anvil (Advanced Networked Virtual Infrastructure Layer) e o framework frontend proprio do FORGE.
Vanilla JS puro, sem bundler, sem dependencias externas.

## Principios

- Zero dependencias — apenas ES Modules nativos do browser
- Separacao clara entre logica (model), DOM (view) e HTTP (service)
- Estado reativo simples via createStore
- Helpers DOM centralizados em dom.js — nunca repetir querySelector inline
- Testabilidade — logica em *.model.js nao toca o DOM

## Arquivos base

| Arquivo | Responsabilidade |
|---|---|
| lib/dom.js | Helpers DOM (qs, show, hide, on, cloneTemplate, etc) |
| lib/state.js | Gerenciador de estado reativo (createStore) |
| lib/ws.js | Wrapper WebSocket com reconexao automatica |
| lib/modal.js | Utilitarios de modal |
| lib/tabs.js | Componente de abas reutilizavel |
| lib/format.js | Formatacao de dados (bytes, etc) |
| lib/clipboard.js | Botao copiar |

## Convencoes de sufixo

| Sufixo | Conteudo | Testavel |
|---|---|---|
| *.model.js | Logica pura, sem DOM | Sim |
| *.view.js | Manipulacao DOM, renderizacao | Nao |
| *.service.js | Chamadas HTTP/WS | Com mock |
| sem sufixo | Utilitarios genericos | Depende |

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
import { qs, on } from "../../lib/dom.js";
export function initDeployView(store) { ... }
```

## Roadmap Anvil

- [x] Fase 1: dom.js + state.js + documentacao
- [ ] Fase 2: migrar utilitarios existentes para dom.js
- [ ] Fase 3: componente base com state + render + mount
- [ ] Fase 4: componentes de deploy (progresso, log, etapas)