export type EstadoJuri = 'aberto' | 'marcado' | 'cancelado';
export interface Formador { token: string; pid: string; nome: string; area: string; ativo: boolean }
export interface JuriConfig { dataInicio: string; dataFim: string; horaInicio: string; horaFim: string; diasSemana: number[]; duracaoMin: number }
export interface JuriInput extends JuriConfig { titulo: string; notas: string }
export interface Juri extends JuriInput { id: string; participantes: Record<string, string>; participantesIds: string[]; estado: EstadoJuri; dataMarcada: string | null }
export interface Disponibilidade { pid: string; slots: string[] }
export interface Sugestao { inicio: string; fim: string; disponiveis: string[]; emFalta: string[] }
export interface ResultadoSugestoes { sugestoes: Sugestao[]; haDataComTodos: boolean; semRespostas: boolean }
