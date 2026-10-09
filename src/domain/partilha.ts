export function linkFormador(origem: string, token: string): string {
  return `${origem}/f/${token}`;
}

export function mensagemConvite(nome: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0];
  return `Olá ${primeiro}! Este é o teu link pessoal para indicares as tuas disponibilidades para os júris:\n${link}\nGuarda-o, é sempre o mesmo.`;
}

export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
