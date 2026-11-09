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

Após compilar o projeto (`npm run build`), carregue a extensão descompactada no Chrome:

1. Abra o Google Chrome e navegue até `chrome://extensions/`.
2. No canto superior direito, ative o **Modo do desenvolvedor** (*Developer mode*).
3. No canto superior esquerdo, clique no botão **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta **`dist/`** gerada na raiz do repositório.
5. A extensão **Okami HUD** estará carregada e pronta para uso.

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
