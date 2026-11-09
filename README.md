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
│   │   └── index.js
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
