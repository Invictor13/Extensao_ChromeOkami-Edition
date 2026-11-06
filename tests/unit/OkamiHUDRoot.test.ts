import { describe, it, expect, beforeEach } from 'vitest';
import { OkamiHUDRoot, registerOkamiHUDRoot } from '../../src/content/components/OkamiHUDRoot';
import { OKAMI_HUD_CUSTOM_ELEMENT } from '../../src/shared/constants';

describe('OkamiHUDRoot Custom Element', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar o custom element corretamente', () => {
    registerOkamiHUDRoot();
    expect(customElements.get(OKAMI_HUD_CUSTOM_ELEMENT)).toBeDefined();
  });

  it('deve renderizar o indicador do Okami HUD dentro do Shadow DOM fechado', () => {
    registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT) as OkamiHUDRoot;
    document.body.appendChild(element);

    expect(element.hasRenderedBadge()).toBe(true);
  });

  it('não deve vazar estilos ou elementos diretamente no light DOM do hospedeiro', () => {
    registerOkamiHUDRoot();
    const element = document.createElement(OKAMI_HUD_CUSTOM_ELEMENT) as OkamiHUDRoot;
    document.body.appendChild(element);

    // No light DOM não deve haver filhos diretos gerados
    expect(element.children.length).toBe(0);
  });
});
