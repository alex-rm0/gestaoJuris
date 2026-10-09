import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { formatarDia, formatarSlot } from '../domain/formatar';
import { gerarDias, gerarHoras } from '../domain/slots';
import type { JuriConfig } from '../domain/tipos';

interface GrelhaProps {
  cfg: JuriConfig;
  selecionados?: Set<string>;
  onChange?: (s: Set<string>) => void;
  disponiveis?: Map<string, string[]>;
  total?: number;
  destaque?: string | null;
  infoExtra?: (slot: string) => ReactNode;
}

const CONSULTA_MOBILE = '(max-width: 640px)';

function useDiasPorPagina(): number {
  const [mobile, setMobile] = useState(() => window.matchMedia?.(CONSULTA_MOBILE).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(CONSULTA_MOBILE);
    if (!m) return;
    const f = () => setMobile(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return mobile ? 3 : 7;
}

export function GrelhaDisponibilidade({ cfg, selecionados, onChange, disponiveis, total = 0, destaque, infoExtra }: GrelhaProps) {
  const dias = useMemo(() => gerarDias(cfg), [cfg]);
  const horas = useMemo(() => gerarHoras(cfg), [cfg]);
  const porPagina = useDiasPorPagina();
  const [pagina, setPagina] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const pintura = useRef<{ modo: 'pintar' | 'apagar'; atual: Set<string> } | null>(null);
  const editavel = !!onChange && !!selecionados;

  const nPaginas = Math.max(1, Math.ceil(dias.length / porPagina));
  const paginaAtual = Math.min(pagina, nPaginas - 1);
  const visiveis = dias.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina);

  useEffect(() => {
    const terminar = () => { pintura.current = null; };
    window.addEventListener('pointerup', terminar);
    window.addEventListener('pointercancel', terminar);
    return () => {
      window.removeEventListener('pointerup', terminar);
      window.removeEventListener('pointercancel', terminar);
    };
  }, []);

  function pintar(slot: string) {
    const p = pintura.current;
    if (!p || !onChange) return;
    const tem = p.atual.has(slot);
    if ((p.modo === 'pintar' && tem) || (p.modo === 'apagar' && !tem)) return;
    const novo = new Set(p.atual);
    if (p.modo === 'pintar') novo.add(slot);
    else novo.delete(slot);
    p.atual = novo;
    onChange(novo);
  }

  function aoPremir(slot: string, e: PointerEvent) {
    if (!editavel) return;
    e.preventDefault();
    pintura.current = { modo: selecionados!.has(slot) ? 'apagar' : 'pintar', atual: selecionados! };
    pintar(slot);
  }

  function aoMover(e: PointerEvent) {
    if (!pintura.current) return;
    const alvo = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const slot = alvo?.dataset?.slot;
    if (slot) pintar(slot);
  }

  const nomesInfo = info ? disponiveis?.get(info) ?? [] : [];

  return (
    <div className={`grelha ${editavel ? 'grelha-editavel' : ''}`}>
      {nPaginas > 1 && (
        <div className="grelha-paginas">
          <button className="btn" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>‹ Anteriores</button>
          <span className="subtil">{formatarDia(visiveis[0])} – {formatarDia(visiveis[visiveis.length - 1])}</span>
          <button className="btn" disabled={paginaAtual >= nPaginas - 1} onClick={() => setPagina(paginaAtual + 1)}>Seguintes ›</button>
        </div>
      )}
      <div className="grelha-scroll">
        <table onPointerMove={aoMover}>
          <thead>
            <tr>
              <th role="columnheader" />
              {visiveis.map((d) => <th key={d} role="columnheader">{formatarDia(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h}>
                <th scope="row" className="grelha-hora">{h.endsWith(':00') ? h : ''}</th>
                {visiveis.map((d) => {
                  const slot = `${d}T${h}`;
                  const nomes = disponiveis?.get(slot) ?? [];
                  const n = nomes.length;
                  const classes = ['celula', selecionados?.has(slot) && 'sel', destaque === slot && 'destaque', info === slot && 'focada']
                    .filter(Boolean).join(' ');
                  return (
                    <td
                      key={slot}
                      data-slot={slot}
                      className={classes}
                      style={{ '--calor': total ? n / total : 0 } as CSSProperties}
                      title={n ? `${n}/${total}: ${nomes.join(', ')}` : undefined}
                      onPointerDown={(e) => aoPremir(slot, e)}
                      onClick={() => { if (!editavel) setInfo(info === slot ? null : slot); }}
                    >
                      {!editavel && n > 0 ? `${n}/${total}` : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!editavel && info && (
        <div className="grelha-info cartao">
          <p>{formatarSlot(info)} — {nomesInfo.length}/{total}: {nomesInfo.length ? nomesInfo.join(', ') : 'ninguém disponível'}</p>
          {infoExtra?.(info)}
        </div>
      )}
    </div>
  );
}
