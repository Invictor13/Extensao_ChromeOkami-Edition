import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../src/content/components/OkamiHUDRoot.js';
import '../../src/content/index.js';
import { OKAMI_HUD_CUSTOM_ELEMENT } from '../../src/shared/constants/index.js';

describe('Content Script Ingestion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('deve injetar o elemento raiz no DOM com sucesso', () => {
    const root = globalThis.injectOkamiHUD();
    expect(root).not.toBeNull();
    expect(document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT)).toBe(root);
  });

  it('não deve reinjetar uma nova instância se já existir uma no DOM', () => {
    const firstInstance = globalThis.injectOkamiHUD();
    const secondInstance = globalThis.injectOkamiHUD();

    expect(firstInstance).toBe(secondInstance);
    expect(document.querySelectorAll(OKAMI_HUD_CUSTOM_ELEMENT).length).toBe(1);
  });

  it('deve injetar com sucesso quando o elemento raiz não for previamente promovido a OkamiHUDRoot', () => {
    const originalCustomElements = globalThis.customElements;
    globalThis.customElements = null;

    const dummyElement = document.createElement('header');
    const attachSpy = vi.spyOn(dummyElement, 'attachShadow');
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === OKAMI_HUD_CUSTOM_ELEMENT) {
        return dummyElement;
      }
      return originalCreateElement(tagName);
    });

    const root = globalThis.injectOkamiHUD();
    expect(root).toBe(dummyElement);
    expect(attachSpy).toHaveBeenCalledWith({ mode: 'closed' });

    createSpy.mockRestore();
    globalThis.customElements = originalCustomElements;
  });
});
