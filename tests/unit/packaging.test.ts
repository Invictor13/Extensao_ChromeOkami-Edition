import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

interface WebAccessibleResource {
  matches?: string[];
  resources: string[];
  use_dynamic_url?: boolean;
}

interface ManifestContentScript {
  matches: string[];
  js?: string[];
  css?: string[];
  run_at?: string;
}

interface ChromeManifestV3 {
  manifest_version: number;
  name: string;
  version: string;
  background?: {
    service_worker: string;
    type?: string;
  };
  content_scripts?: ManifestContentScript[];
  chrome_url_overrides?: {
    newtab?: string;
  };
  web_accessible_resources?: WebAccessibleResource[];
}

describe('Validação do Empacotamento e Manifesto (dist/manifest.json)', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const distDir = path.join(rootDir, 'dist');
  const manifestPath = path.join(distDir, 'manifest.json');

  beforeAll(() => {
    // Garante que o artefato esteja gerado antes da validação
    if (!fs.existsSync(manifestPath)) {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    }
  });

  it('deve gerar o diretório dist/ autossuficiente com dist/manifest.json na raiz', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('deve conter um manifesto Manifest V3 válido', () => {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest) as ChromeManifestV3;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Okami HUD');
    expect(manifest.version).toBeDefined();
  });

  it('não deve conter referências a arquivos .ts no manifesto final', () => {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    // Nenhuma menção a extensões de código TypeScript não compilado
    expect(rawManifest).not.toMatch(/"[^"]+\.ts"/);
  });

  it('deve apontar o Background Service Worker para um arquivo JavaScript existente em dist/', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ChromeManifestV3;
    expect(manifest.background).toBeDefined();
    expect(manifest.background?.service_worker).toBeDefined();

    const swFile = manifest.background!.service_worker;
    expect(swFile.endsWith('.js')).toBe(true);
    expect(swFile.endsWith('.ts')).toBe(false);

    const swFullPath = path.join(distDir, swFile);
    expect(fs.existsSync(swFullPath)).toBe(true);
  });

  it('deve apontar todos os Content Scripts para arquivos JavaScript existentes em dist/', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ChromeManifestV3;
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts!.length).toBeGreaterThan(0);

    for (const scriptGroup of manifest.content_scripts!) {
      if (scriptGroup.js) {
        for (const jsFile of scriptGroup.js) {
          expect(jsFile.endsWith('.js')).toBe(true);
          expect(jsFile.endsWith('.ts')).toBe(false);

          const scriptFullPath = path.join(distDir, jsFile);
          expect(fs.existsSync(scriptFullPath)).toBe(true);
        }
      }
    }
  });

  it('deve apontar o chrome_url_overrides.newtab para um arquivo HTML existente em dist/', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ChromeManifestV3;
    expect(manifest.chrome_url_overrides?.newtab).toBeDefined();

    const newtabPath = manifest.chrome_url_overrides!.newtab!;
    expect(newtabPath.endsWith('.html')).toBe(true);

    const fullPath = path.join(distDir, newtabPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('deve garantir que todos os recursos em web_accessible_resources existam em dist/', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ChromeManifestV3;
    if (manifest.web_accessible_resources) {
      for (const entry of manifest.web_accessible_resources) {
        for (const resource of entry.resources) {
          const resourceFullPath = path.join(distDir, resource);
          expect(fs.existsSync(resourceFullPath)).toBe(true);
        }
      }
    }
  });
});
