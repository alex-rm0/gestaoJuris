import { useState } from 'react';
import { linkFormador, linkWhatsApp, mensagemConvite } from '../domain/partilha';

export function BotoesPartilha({ nome, token }: { nome: string; token: string }) {
  const [copiado, setCopiado] = useState(false);
  const link = linkFormador(window.location.origin, token);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      <button className="btn" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
      <a className="btn whatsapp" href={linkWhatsApp(mensagemConvite(nome, link))} target="_blank" rel="noreferrer">WhatsApp</a>
    </>
  );
}
