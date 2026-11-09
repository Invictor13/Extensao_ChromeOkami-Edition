import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeBackground } from '../../src/background/index.js';

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve registrar os listeners de runtime sem lançar exceções', () => {
    const onInstalledListener = vi.fn();
    const onStartupListener = vi.fn();

    // Mock chrome.runtime
    globalThis.chrome = {
      runtime: {
        onInstalled: { addListener: onInstalledListener },
        onStartup: { addListener: onStartupListener },
      },
    };

    expect(() => initializeBackground()).not.toThrow();
    expect(onInstalledListener).toHaveBeenCalled();
  });

  it('deve lidar de forma segura quando executado fora do contexto de extensão', () => {
    // Mock ausente
    const originalChrome = globalThis.chrome;
    globalThis.chrome = undefined;

    expect(() => initializeBackground()).not.toThrow();

    globalThis.chrome = originalChrome;
  });
});
