const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function aleatorio(n: number): string {
  const out: string[] = [];
  const buf = new Uint8Array(64);
  while (out.length < n) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      // 248 = 62 * 4: rejeitar o resto evita enviesamento
      if (b < 248 && out.length < n) out.push(ALFABETO[b % 62]);
    }
  }
  return out.join('');
}

export const gerarToken = (): string => aleatorio(32);
export const gerarPid = (): string => aleatorio(20);
export const TOKEN_VALIDO = /^[A-Za-z0-9]{32}$/;
