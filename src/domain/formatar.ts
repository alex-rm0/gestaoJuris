const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function partes(data: string): [number, number, number] {
  const [a, m, d] = data.split('-').map(Number);
  return [a, m, d];
}

const dd = (n: number) => String(n).padStart(2, '0');

export function formatarDia(data: string): string {
  const [a, m, d] = partes(data);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${dd(d)}/${dd(m)}`;
}

export function formatarSlot(slot: string): string {
  const [dia, hora] = slot.split('T');
  return `${formatarDia(dia)}, ${hora}`;
}

export function formatarIntervalo(inicio: string, fim: string): string {
  return `${formatarSlot(inicio)}–${fim.split('T')[1]}`;
}

export function formatarData(data: string): string {
  const [a, m, d] = partes(data);
  return `${dd(d)}/${dd(m)}/${a}`;
}
