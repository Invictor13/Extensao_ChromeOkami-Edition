# Okami HUD — Chrome Okami Edition

Okami HUD é uma extensão para Google Chrome (Manifest V3) que oferece uma interface minimalista, contextual e acionada por bordas, construída com arquitetura nativa em JavaScript sem processo de build para execução.

---

## 🌐 Como Carregar a Extensão no Google Chrome

A extensão foi projetada em **arquitetura nativa Manifest V3**, permitindo o carregamento direto do diretório do repositório no Chrome, **sem a necessidade de executar comandos npm ou etapas de compilação/build**.

### Passo a passo para instalação direta

1. Abra o **Google Chrome** e acesse a página de extensões digitando `chrome://extensions/` na barra de endereços (ou via *Menu > Extensões > Gerenciar extensões*).
2. No canto superior direito, ative a chave seletora **Modo do desenvolvedor** (*Developer mode*).
3. No canto superior esquerdo, clique no botão **Carregar sem compactação** (*Load unpacked*).
4. No gerenciador de arquivos, selecione diretamente a **pasta raiz do repositório** (onde se encontra o arquivo `manifest.json`).
5. A extensão **Okami HUD** será carregada imediatamente e estará pronta para uso, com o Service Worker e Content Scripts ativos.

---

## 🖥️ Modo Imersivo e HUD Superior (PR03 / PR04)

O Okami HUD combina o modo imersivo com uma barra superior contextual e acionada por bordas, projetada para foco total no conteúdo web:

- **Ativação por clique**: Clique no ícone do Okami HUD na barra de ferramentas do Chrome.
- **Alternância por atalho de teclado**: Pressione `Alt+Shift+F` para alternar (ativar/desativar).
  - É possível consultar ou personalizar o atalho acessando `chrome://extensions/shortcuts` no Chrome.
- **Atalho Dedicado do HUD Superior (PR04.1)**: Pressione `Alt+Shift+H` para mostrar ou ocultar a barra superior sob demanda durante o modo imersivo.
- **HUD Superior Contextual (PR04 / PR04.1)**:
  - Oculto por padrão durante a navegação normal sem bloquear cliques ou rolagem na página hospedeira (`pointer-events: none`).
  - Ativado automaticamente pela aproximação do cursor à borda superior da tela durante o modo imersivo (`pointermove`/`mousemove` com `clientY <= 8`).
  - Animação suave de entrada (`slide-down` com fade) e saída (`slide-up`).
  - Permanece visível continuamente durante a interação do usuário na barra superior ou na zona de borda.
  - Recolhimento com atraso inteligente (~380ms) ao afastar o cursor para evitar desaparecimentos acidentais.
- **Estrutura da Barra Superior**:
  - **Região Esquerda**: Identidade visual Okami (insígnia geométrica `◈ OKAMI HUD`) e espaço reservado para controles futuros.
  - **Região Central (PR04.4)**: Barra de Endereço e Navegação Funcional interativa dentro de Shadow DOM fechado.
  - **Região Direita**: Controles do escopo atual, integrando o botão de saída do modo imersivo (*✕ Sair*).
- **Barra de Endereço e Navegação Funcional (PR04.4)**:
  - **Campo Interativo**: Permite digitação, edição, clique, foco com auto-seleção de texto para substituição rápida e botão de limpeza (`✕`).
  - **Navegação Direta e Normalização**: URLs diretas (`https://...`) e domínios sem protocolo (`github.com`) são normalizados de forma segura para HTTPS.
  - **Pesquisa na Web Integrada**: Termos de busca e textos comuns acionam pesquisa na web através do mecanismo padrão configurado (Google).
  - **Segurança Rigorosa**: Bloqueio de protocolos inseguros (`javascript:`, `data:`, `file:`, `chrome:`, etc.) tanto no Content Script quanto no Background Service Worker.
  - **Sincronização Bidirecional Contínua**: O endereço acompanha navegações tradicionais, redirecionamentos e mudanças em Single Page Applications (`pushState`, `replaceState`, `popstate`, `hashchange`) sem recriar o HUD.
  - **Suspensão de Auto-Hide**: A barra superior suspende o cronômetro de recolhimento enquanto o usuário estiver com foco ativo no campo de endereço.
- **Saídas nativas**: É possível sair a qualquer momento por `F11` ou `Esc` nativos do sistema. O HUD e a barra são recolhidos e desativados imediatamente.

---

## 🚀 Requisitos para Desenvolvimento e Testes

- **Node.js**: v18 ou superior (apenas para testes automatizados e lint)
- **npm**: v9 ou superior
- **Google Chrome**: Versão compatível com Manifest V3

> **Nota:** O Node.js e npm são necessários **apenas** para executar os testes unitários (`npm test`) e análise de qualidade (`npm run lint`). **Para usar a extensão no Chrome, nenhum comando de terminal é necessário.**

---

## 🛠️ Scripts de Desenvolvimento

Para executar testes unitários e lint no ambiente de desenvolvimento:

```bash
# Instalação das dependências de desenvolvimento e testes
npm ci

# Executa a suíte de testes unitários com Vitest
npm test

# Executa a análise estática com ESLint
npm run lint
```

---

## 📁 Estrutura do Projeto

O projeto segue a convenção clássica e nativa de extensões Manifest V3:

```text
├── manifest.json         # Manifesto raiz da extensão Chrome (Manifest V3)
├── vitest.config.js      # Configuração de testes unitários com Vitest
├── src/
│   ├── background/       # Background Service Worker (ES Modules nativos)
│   │   ├── index.js
│   │   └── managers/
│   │       └── ImmersiveModeManager.js
│   ├── content/          # Content Scripts e Web Components nativos
│   │   ├── components/
│   │   │   └── OkamiHUDRoot.js
│   │   └── index.js
│   ├── newtab/           # Página customizada de Nova Aba
│   │   ├── index.html
│   │   ├── index.js
│   │   └── styles.css
│   └── shared/           # Constantes e utilitários compartilhados
│       ├── constants/
│       │   └── index.js
│       └── utils/
│           └── logger.js
└── tests/
    └── unit/             # Testes unitários com Vitest e Happy-DOM
```

---

## 📋 Roteiro de Validação Manual no Google Chrome

1. **Carregamento Unpacked**: Carregue a pasta raiz da extensão em `chrome://extensions/`. Verifique se o Service Worker é ativado sem erros no console.
2. **Ativação por Ícone ou Atalho**: Abra uma página HTTPS comum (ex: `https://www.google.com` ou `https://example.com`) e ative o modo imersivo via clique no ícone da extensão ou pressionando `Alt+Shift+F`. A janela entrará em fullscreen.
3. **Ocultação Inicial**: Ao entrar no modo imersivo, a barra superior permanece recolhida/oculta no topo, permitindo visualização completa e sem bloqueio do conteúdo da página.
4. **Aproximação da Borda Superior**: Mova o cursor do mouse em direção à borda superior da tela (topo 0 a 8px). A barra superior do Okami HUD deslizará suavemente para baixo com animação translúcida refinada.
5. **Interação com a Barra**: Mova o cursor sobre os elementos da barra superior (identidade Okami, área central e botão de saída). A barra permanece totalmente aberta e visível enquanto você interage com ela.
6. **Recolhimento com Atraso**: Afaste o cursor da barra superior para o meio ou parte inferior da página. A barra aguarda um pequeno atraso (~380ms) e então se recolhe suavemente para cima, evitando fechamentos acidentais.
7. **Saída pelo Botão Visual**: Aproxime o mouse da borda superior para exibir a barra e clique no botão `✕ Sair`. A janela sai imediatamente do modo imersivo, restaurando o tamanho anterior, e a barra é desabilitada.
8. **Alternância por Atalho**: Pressione `Alt+Shift+F` para reentrar no modo imersivo e pressione novamente para sair. A barra é ativada e desativada em perfeita sincronia com o atalho.
9. **Sincronização entre Abas**: Com o modo imersivo ativado, alterne entre abas que suportam Content Scripts; a barra superior e o acionador por borda continuam funcionando uniformemente em todas as abas da janela.
10. **Barra de Endereço e Navegação (PR04.4)**:
    - **Foco e Auto-seleção**: Aproxime o cursor do topo para revelar a barra e clique no campo de endereço. O texto da URL atual é selecionado automaticamente para digitação ágil, e a barra suspende o auto-hide enquanto estiver focada.
    - **Navegação por Domínio**: Digite `github.com` e pressione `Enter`. O HUD exibe indicador discreto de carregamento (`◌`) e a aba atual navega para `https://github.com/`.
    - **Pesquisa na Web**: Digite termos textuais (ex: `pesquisa de RPG medieval`) e pressione `Enter`. A aba atual realiza a pesquisa pelo Google.
    - **Limpeza do Campo**: Digite qualquer valor e clique no botão circular `✕` para limpar o campo imediatamente. Pressione `Esc` para restaurar o endereço original e fechar o foco.
    - **Sincronização em SPAs**: Ao navegar internamente em sites com histórico client-side (como GitHub, YouTube ou dashboards SPA), observe que o campo de endereço atualiza instantaneamente sem recriar o HUD.
11. **Saída Nativa (`F11`/`Esc`)**: Em modo imersivo, saia pressionando `F11` ou `Esc`. O HUD e o gatilho de borda são imediatamente desabilitados pela sincronização de `onBoundsChanged`.
