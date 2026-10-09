import type { JuriConfig, JuriInput } from './tipos';

const MS_DIA = 86_400_000;
export const MAX_DIAS = 62;

function paraUTC(data: string): number {
  const [a, m, d] = data.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function deUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function paraMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function deMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 1 = segunda … 7 = domingo */
export function diaSemanaISO(data: string): number {
  const d = new Date(paraUTC(data)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function gerarDias(cfg: JuriConfig): string[] {
  const out: string[] = [];
  const fim = paraUTC(cfg.dataFim);
  for (let t = paraUTC(cfg.dataInicio); t <= fim; t += MS_DIA) {
    const dia = deUTC(t);
    if (cfg.diasSemana.includes(diaSemanaISO(dia))) out.push(dia);
  }
  return out;
}

export function gerarHoras(cfg: JuriConfig): string[] {
  const out: string[] = [];
  for (let m = paraMinutos(cfg.horaInicio); m < paraMinutos(cfg.horaFim); m += 30) out.push(deMinutos(m));
  return out;
}

export function gerarGrelha(cfg: JuriConfig): string[] {
  const horas = gerarHoras(cfg);
  return gerarDias(cfg).flatMap((dia) => horas.map((h) => `${dia}T${h}`));
}

export function fimDe(inicio: string, duracaoMin: number): string {
  const [dia, hora] = inicio.split('T');
  return `${dia}T${deMinutos(paraMinutos(hora) + duracaoMin)}`;
}

export interface Candidato {
  inicio: string;
  fim: string;
  blocos: string[];
}

export function gerarCandidatos(cfg: JuriConfig): Candidato[] {
  const n = cfg.duracaoMin / 30;
  const horas = gerarHoras(cfg);
  const out: Candidato[] = [];
  for (const dia of gerarDias(cfg)) {
    for (let i = 0; i + n <= horas.length; i++) {
      const blocos = horas.slice(i, i + n).map((h) => `${dia}T${h}`);
      out.push({ inicio: blocos[0], fim: fimDe(blocos[0], cfg.duracaoMin), blocos });
    }
  }
  return out;
}

export function eInicioValido(cfg: JuriConfig, inicio: string): boolean {
  return gerarCandidatos(cfg).some((c) => c.inicio === inicio);
}

export type ErrosJuri = Partial<Record<'titulo' | 'datas' | 'horas' | 'duracaoMin' | 'diasSemana' | 'participantes', string>>;

export function validarJuri(input: JuriInput, nParticipantes: number): ErrosJuri {
  const e: ErrosJuri = {};
  if (!input.titulo.trim()) e.titulo = 'Indica um título.';

  if (input.duracaoMin % 30 !== 0 || input.duracaoMin < 30 || input.duracaoMin > 240) {
    e.duracaoMin = 'A duração tem de ser entre 30 e 240 minutos, em múltiplos de 30.';
  }

  if (input.diasSemana.length === 0) e.diasSemana = 'Escolhe pelo menos um dia da semana.';

  if (!input.dataInicio || !input.dataFim) e.datas = 'Indica as datas de início e de fim.';
  else if (input.dataInicio > input.dataFim) e.datas = 'A data de início tem de ser anterior ou igual à data de fim.';
  else if ((paraUTC(input.dataFim) - paraUTC(input.dataInicio)) / MS_DIA + 1 > MAX_DIAS) e.datas = `O intervalo não pode ter mais de ${MAX_DIAS} dias.`;
  else if (!e.diasSemana && gerarDias(input).length === 0) e.datas = 'O intervalo não inclui nenhum dos dias da semana escolhidos.';

  const ini = paraMinutos(input.horaInicio);
  const fim = paraMinutos(input.horaFim);
  if (Number.isNaN(ini) || Number.isNaN(fim)) e.horas = 'Indica o horário.';
  else if (ini % 30 !== 0 || fim % 30 !== 0) e.horas = 'As horas têm de ser em múltiplos de 30 minutos (ex.: 09:00, 09:30).';
  else if (ini >= fim) e.horas = 'A hora de início tem de ser anterior à hora de fim.';
  else if (fim - ini < input.duracaoMin) e.horas = 'O horário diário é mais curto do que a duração do júri.';

  if (nParticipantes < 1) e.participantes = 'Escolhe pelo menos um formador.';
  return e;
}
