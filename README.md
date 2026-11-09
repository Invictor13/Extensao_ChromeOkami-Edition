# Okami HUD — Chrome Okami Edition

Okami HUD é uma extensão para Google Chrome (Manifest V3) que oferece uma interface minimalista, contextual e acionada por bordas.

---

## 🚀 Requisitos

- **Node.js**: v18 ou superior
- **npm**: v9 ou superior
- **Google Chrome**: Versão compatível com Manifest V3

---

## 📦 Instalação de Dependências

Para instalar as dependências do projeto de forma reprodutível, utilize o comando:

```bash
npm ci
```

---

## 🛠️ Scripts Disponíveis

- **`npm run build`**: Executa a verificação estática de tipos (`tsc --noEmit`) e compila o projeto com o Vite e CRXJS, gerando os artefatos na pasta `dist/`.
- **`npm run dev`**: Inicia o modo de desenvolvimento com hot-reload/watch da extensão.
- **`npm test`**: Executa a suíte de testes unitários com Vitest e ambiente Happy-DOM.
- **`npm run lint`**: Analisa o código TypeScript com o ESLint.

---

## 🌐 Como Carregar a Extensão no Google Chrome

### ⚠️ Importante: Carregue sempre a pasta `dist/`

> **NUNCA carregue a raiz do repositório no Chrome.**
>
> O arquivo `manifest.json` na raiz é o **manifesto-fonte** utilizado pelo Vite e `@crxjs/vite-plugin`, referenciando arquivos TypeScript (`.ts`). O Chrome não executa TypeScript nativamente. Se você tentar carregar a raiz do projeto, o Chrome emitirá o erro:
> ```text
> Invalid script mime type: Não foi possível carregar o arquivo "src/content/index.ts" para o script de conteúdo. Esse tipo de script só pode ser carregado de arquivos JavaScript compatíveis, como .js.
> ```
> O comando `npm run build` compila o TypeScript, empacota os módulos e gera o manifesto final em **`dist/manifest.json`**. A pasta **`dist/`** é 100% autossuficiente e contém todos os scripts JavaScript (`.js`), páginas HTML e recursos compilados necessários para a instalação.

### Passo a passo para instalação

1. Certifique-se de ter construído a extensão executando:
   ```bash
   npm run build
   ```
2. Abra o Google Chrome e navegue até `chrome://extensions/`.
3. No canto superior direito, ative o botão **Modo do desenvolvedor** (*Developer mode*).
4. No canto superior esquerdo, clique no botão **Carregar sem compactação** (*Load unpacked*).
5. No seletor de arquivos, selecione a pasta **`dist/`** (gerada na raiz do projeto).
6. A extensão **Okami HUD** será carregada e estará ativa.

---

## 📁 Estrutura do Projeto

```text
├── manifest.json         # Manifesto raiz da extensão Chrome (Manifest V3)
├── vite.config.ts        # Configuração do Vite com @crxjs/vite-plugin e Vitest
├── tsconfig.json         # Configurações do TypeScript
├── src/
│   ├── background/       # Service Worker de segundo plano
│   ├── content/          # Content Scripts e componentes Web Components
│   ├── newtab/           # Página customizada de Nova Aba
│   └── shared/           # Constantes, tipos e utilitários compartilhados
└── tests/
    └── unit/             # Testes unitários com Vitest
```
