import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Validação da Arquitetura Nativa e Manifesto (manifest.json)', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const manifestPath = path.join(rootDir, 'manifest.json');

  it('deve manter o manifest.json diretamente na raiz do projeto', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('deve conter um manifesto Manifest V3 válido', () => {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Okami HUD');
    expect(manifest.version).toBeDefined();
  });

  it('não deve conter referências a arquivos .ts no manifesto raiz', () => {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    // Nenhuma menção a extensões de código TypeScript não compilado
    expect(rawManifest).not.toMatch(/"[^"]+\.ts"/);
  });

  it('deve apontar o Background Service Worker para um arquivo JavaScript existente na raiz com type: module', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBeDefined();
    expect(manifest.background.type).toBe('module');

    const swFile = manifest.background.service_worker;
    expect(swFile.endsWith('.js')).toBe(true);
    expect(swFile.endsWith('.ts')).toBe(false);

    const swFullPath = path.join(rootDir, swFile);
    expect(fs.existsSync(swFullPath)).toBe(true);
  });

  it('deve apontar todos os Content Scripts para arquivos JavaScript existentes na raiz', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);

    for (const scriptGroup of manifest.content_scripts) {
      if (scriptGroup.js) {
        for (const jsFile of scriptGroup.js) {
          expect(jsFile.endsWith('.js')).toBe(true);
          expect(jsFile.endsWith('.ts')).toBe(false);

          const scriptFullPath = path.join(rootDir, jsFile);
          expect(fs.existsSync(scriptFullPath)).toBe(true);
        }
      }
    }
  });

  it('não deve conter imports ou exports estáticos incompatíveis nos Content Scripts', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const scriptGroup of manifest.content_scripts) {
      if (scriptGroup.js) {
        for (const jsFile of scriptGroup.js) {
          const content = fs.readFileSync(path.join(rootDir, jsFile), 'utf8');
          // No static import or export statements outside modules
          expect(content).not.toMatch(/^\s*import\s+/m);
          expect(content).not.toMatch(/^\s*export\s+/m);
        }
      }
    }
  });

  it('deve apontar o chrome_url_overrides.newtab para um arquivo HTML existente na raiz', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.chrome_url_overrides?.newtab).toBeDefined();

    const newtabPath = manifest.chrome_url_overrides.newtab;
    expect(newtabPath.endsWith('.html')).toBe(true);

    const fullPath = path.join(rootDir, newtabPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('não deve exigir diretório dist/ ou processo de build para a extensão ser executada', () => {
    // A extensão é 100% autossuficiente diretamente da raiz do repositório
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    expect(rawManifest).not.toContain('dist/');
  });
});
