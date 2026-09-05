import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __setScreenshotRendererForTests,
  capturePageForBugReport,
  captureScreenshot,
  isBugReportChrome,
  readImageAsDataUrl,
  waitForNextPaint,
} from '@/lib/bugReport';

function pngCanvas(): HTMLCanvasElement {
  return {
    toDataURL: () => 'data:image/png;base64,AAA',
  } as unknown as HTMLCanvasElement;
}

describe('bugReport — captura de tela', () => {
  afterEach(() => {
    __setScreenshotRendererForTests(null);
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('isBugReportChrome reconhece o dialog e o botão de ajuda', () => {
    document.body.innerHTML = `
      <div data-bug-report-dialog id="dialog"><span id="inside">x</span></div>
      <button data-bug-report-chrome id="help">?</button>
      <main id="page">ok</main>
    `;
    expect(isBugReportChrome(document.getElementById('inside') as Element)).toBe(true);
    expect(isBugReportChrome(document.getElementById('help') as Element)).toBe(true);
    expect(isBugReportChrome(document.getElementById('page') as Element)).toBe(false);
  });

  it('waitForNextPaint resolve depois de 2 animation frames', async () => {
    const order: string[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      order.push('raf');
      cb(0);
      return 1;
    });
    order.push('before');
    await waitForNextPaint();
    order.push('after');
    expect(order.filter((s) => s === 'raf')).toHaveLength(2);
    expect(order[0]).toBe('before');
    expect(order[order.length - 1]).toBe('after');
  });

  it('captureScreenshot fotografa o body no tamanho do viewport e ignora o chrome do reporter', async () => {
    const render = vi.fn(async (el: HTMLElement, opts?: Record<string, unknown>) => {
      expect(el).toBe(document.body);
      expect(opts?.width).toBe(window.innerWidth);
      expect(opts?.height).toBe(window.innerHeight);
      expect(opts?.scrollX).toBe(-(window.scrollX || 0));
      expect(opts?.scrollY).toBe(-(window.scrollY || 0));
      const ignore = opts?.ignoreElements as (node: Element) => boolean;
      const chrome = document.createElement('div');
      chrome.setAttribute('data-bug-report-dialog', '');
      chrome.appendChild(document.createElement('span'));
      expect(ignore(chrome.firstElementChild as Element)).toBe(true);
      const page = document.createElement('main');
      expect(ignore(page)).toBe(false);
      return pngCanvas();
    });
    __setScreenshotRendererForTests(render);

    const shot = await captureScreenshot();
    expect(shot).toBe('data:image/png;base64,AAA');
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('captureScreenshot usa o alvo explícito quando informado', async () => {
    const target = document.createElement('section');
    document.body.appendChild(target);
    const render = vi.fn(async (el: HTMLElement) => {
      expect(el).toBe(target);
      return pngCanvas();
    });
    __setScreenshotRendererForTests(render);

    const shot = await captureScreenshot({ target });
    expect(shot).toBe('data:image/png;base64,AAA');
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('captureScreenshot cai no fallback quando o viewport falha', async () => {
    const render = vi.fn(async (el: HTMLElement, opts?: Record<string, unknown>) => {
      if (el === document.body && opts && 'width' in opts) {
        throw new Error('viewport fail');
      }
      if (el === document.documentElement) {
        throw new Error('documentElement fail');
      }
      return pngCanvas();
    });
    __setScreenshotRendererForTests(render);

    const shot = await captureScreenshot();
    expect(shot).toBe('data:image/png;base64,AAA');
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('captureScreenshot devolve null quando todas as tentativas falham', async () => {
    __setScreenshotRendererForTests(async () => {
      throw new Error('boom');
    });
    await expect(captureScreenshot()).resolves.toBeNull();
  });

  it('capturePageForBugReport espera o paint e devolve print + contexto', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    __setScreenshotRendererForTests(async () => pngCanvas());

    const result = await capturePageForBugReport();
    expect(result.screenshot).toBe('data:image/png;base64,AAA');
    expect(result.context.timestamp).toBeTruthy();
    expect(result.context.viewportWidth).toBe(window.innerWidth);
  });

  it('readImageAsDataUrl lê arquivo de imagem e rejeita não-imagem', async () => {
    const image = new File(['fake'], 'print.png', { type: 'image/png' });
    const text = new File(['nope'], 'notes.txt', { type: 'text/plain' });

    await expect(readImageAsDataUrl(text)).resolves.toBeNull();

    const url = await readImageAsDataUrl(image);
    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});
