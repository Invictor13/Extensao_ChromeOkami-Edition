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

## 🖥️ Modo Imersivo (PR03)

O Modo Imersivo permite focar completamente na página ou aplicativo web, controlando o fullscreen do Chrome com segurança e sem reter o usuário:

- **Ativação por clique**: Clique no ícone do Okami HUD na barra de ferramentas do Chrome.
- **Alternância por atalho de teclado**: Pressione `Alt+Shift+F` para alternar (ativar/desativar).
  - É possível consultar ou personalizar o atalho acessando `chrome://extensions/shortcuts` no Chrome.
- **Botão de saída visual**: Quando em modo imersivo, um botão discreto de saída (*✕ Sair do Modo Imersivo*) é exibido de forma isolada no topo direito da tela, sem interferir no conteúdo da página.
- **Saídas nativas**: É possível sair a qualquer momento por `F11` ou `Esc` nativos do sistema. O estado é automaticamente sincronizado.

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
2. **Ativação por Ícone**: Abra uma página normal (ex: `https://www.google.com`) e clique no ícone da extensão. A janela deve entrar em fullscreen e o botão visual de saída deve aparecer no topo direito.
3. **Alternância por Atalho**: Pressione `Alt+Shift+F`. A janela deve alternar saindo de fullscreen. Pressionar novamente deve retornar ao fullscreen.
4. **Customização de Atalho**: Acesse `chrome://extensions/shortcuts` e confirme que o atalho "Alternar modo imersivo" está registrado e customizável.
5. **Saída por Botão Visual**: Em fullscreen, clique no botão "Sair do Modo Imersivo". A janela deve restaurar seu tamanho anterior (normal ou maximizado) e o botão deve desaparecer.
6. **Troca de Abas em Modo Imersivo**: Com modo imersivo ativado, abra uma nova aba ou alterne de aba; o botão de saída deve permanecer visível em abas que suportam Content Scripts.
7. **Páginas Protegidas (`chrome://`)**: Acesse uma aba como `chrome://settings/` ou `chrome://extensions/`. Ative o atalho `Alt+Shift+F` para entrar em fullscreen. Note que extensões não podem injetar Content Scripts em `chrome://`, mas o usuário ainda pode sair a qualquer momento pelo mesmo atalho (`Alt+Shift+F`) ou via `F11`/`Esc`.
8. **Saída Nativa**: Em fullscreen, saia pressionando `F11`. Ao navegar ou interagir, o botão de saída desaparece automaticamente pela sincronização via `onBoundsChanged`.
9. **Fechamento e Reinicialização**: Feche a janela durante o modo imersivo. Ao abrir uma nova janela, o estado não persiste indevidamente fullscreen graças ao uso de `chrome.storage.session`.
