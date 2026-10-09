import { gerarCandidatos, gerarGrelha } from './slots';
import type { Disponibilidade, JuriConfig, ResultadoSugestoes, Sugestao } from './tipos';

const MAX_SUGESTOES = 5;

function slotsValidos(cfg: JuriConfig, pids: string[], disps: Disponibilidade[]): Map<string, Set<string>> {
  const grelha = new Set(gerarGrelha(cfg));
  const porPid = new Map<string, Set<string>>();
  for (const d of disps) {
    if (!pids.includes(d.pid)) continue;
    const s = new Set(d.slots.filter((x) => grelha.has(x)));
    if (s.size > 0) porPid.set(d.pid, s);
  }
  return porPid;
}

function sobrepoe(a: Sugestao, b: Sugestao): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

function mesmoGrupo(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function sugerirDatas(
  juri: JuriConfig & { participantesIds: string[] },
  disps: Disponibilidade[],
): ResultadoSugestoes {
  const participantes = juri.participantesIds;
  const porPid = slotsValidos(juri, participantes, disps);
  if (porPid.size === 0) return { sugestoes: [], haDataComTodos: false, semRespostas: true };

  const pontuados: Sugestao[] = gerarCandidatos(juri)
    .map((c) => {
      const disponiveis = participantes.filter((p) => {
        const s = porPid.get(p);
        return !!s && c.blocos.every((b) => s.has(b));
      });
      return { inicio: c.inicio, fim: c.fim, disponiveis, emFalta: participantes.filter((p) => !disponiveis.includes(p)) };
    })
    .filter((c) => c.disponiveis.length > 0);

  pontuados.sort((a, b) => b.disponiveis.length - a.disponiveis.length || a.inicio.localeCompare(b.inicio));

  const escolhidos: Sugestao[] = [];
  for (const c of pontuados) {
    if (escolhidos.length === MAX_SUGESTOES) break;
    if (!escolhidos.some((e) => sobrepoe(e, c) && mesmoGrupo(e.disponiveis, c.disponiveis))) escolhidos.push(c);
  }

  return {
    sugestoes: escolhidos,
    haDataComTodos: pontuados.some((c) => c.disponiveis.length === participantes.length),
    semRespostas: false,
  };
}

export function respondeu(cfg: JuriConfig, disp: Disponibilidade | undefined): boolean {
  if (!disp) return false;
  const grelha = new Set(gerarGrelha(cfg));
  return disp.slots.some((s) => grelha.has(s));
}

export function contarPorSlot(cfg: JuriConfig, pids: string[], disps: Disponibilidade[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [pid, slots] of slotsValidos(cfg, pids, disps)) {
    for (const s of slots) m.set(s, [...(m.get(s) ?? []), pid]);
  }
  for (const lista of m.values()) lista.sort((a, b) => pids.indexOf(a) - pids.indexOf(b));
  return m;
}
