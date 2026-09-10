const TITLE_FLASH = 'É a sua vez!';

function playCallTones(): void {
  try {
    const AudioCtx = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.22, 0.44].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = index === 2 ? 988 : 880;
      gain.gain.setValueAtTime(0.28, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.18);
    });
  } catch {
    // Sem áudio disponível
  }
}

function vibrateCall(): void {
  try {
    window.navigator.vibrate?.([220, 80, 220, 80, 420]);
  } catch {
    // Sem vibração
  }
}

function flashDocumentTitle(): void {
  if (typeof document === 'undefined') return;
  const original = document.title;
  let on = true;
  document.title = TITLE_FLASH;
  const id = window.setInterval(() => {
    document.title = on ? original : TITLE_FLASH;
    on = !on;
  }, 900);
  window.setTimeout(() => {
    window.clearInterval(id);
    document.title = original;
  }, 12_000);
}

/** Alerta imediato no aparelho do cliente quando o gestor toca em Chamar. Push fica para o futuro. */
export function playQueueCallAlert(): void {
  playCallTones();
  vibrateCall();
  flashDocumentTitle();
}
