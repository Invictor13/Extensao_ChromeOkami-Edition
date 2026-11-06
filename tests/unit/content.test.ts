import { describe, it, expect, beforeEach } from 'vitest';
import { injectOkamiHUD } from '../../src/content/index';
import { OKAMI_HUD_CUSTOM_ELEMENT } from '../../src/shared/constants';

describe('Content Script Ingestion', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve injetar o elemento raiz no DOM com sucesso', () => {
    const root = injectOkamiHUD();
    expect(root).not.toBeNull();
    expect(document.querySelector(OKAMI_HUD_CUSTOM_ELEMENT)).toBe(root);
  });

  it('não deve reinjetar uma nova instância se já existir uma no DOM', () => {
    const firstInstance = injectOkamiHUD();
    const secondInstance = injectOkamiHUD();

    expect(firstInstance).toBe(secondInstance);
    expect(document.querySelectorAll(OKAMI_HUD_CUSTOM_ELEMENT).length).toBe(1);
  });
});
