import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAutoGravar } from './useAutoGravar';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('grava uma só vez, com o último valor, depois do atraso', async () => {
  const gravar = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => {
    result.current.agendar(['a']);
    result.current.agendar(['a', 'b']);
  });
  expect(result.current.estado).toBe('aGuardar');
  expect(gravar).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(gravar).toHaveBeenCalledTimes(1);
  expect(gravar).toHaveBeenCalledWith(['a', 'b']);
  expect(result.current.estado).toBe('guardado');
});

it('ao sair da página antes do atraso, grava na mesma a última alteração', () => {
  const gravar = vi.fn().mockResolvedValue(undefined);
  const { result, unmount } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => { result.current.agendar(['x']); });
  unmount();
  expect(gravar).toHaveBeenCalledWith(['x']);
});

it('em erro mostra o estado e volta a tentar', async () => {
  const gravar = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue(undefined);
  const { result } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => { result.current.agendar(['a']); });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(result.current.estado).toBe('erro');
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(gravar).toHaveBeenCalledTimes(2);
  expect(result.current.estado).toBe('guardado');
});

it('ao fechar ou esconder a página, grava logo o que estiver pendente', () => {
  const gravar = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => { result.current.agendar(['y']); });
  act(() => { window.dispatchEvent(new Event('pagehide')); });
  expect(gravar).toHaveBeenCalledWith(['y']);
});

it('sem permissão, não insiste e mostra estado negado', async () => {
  const gravar = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
  const { result } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => { result.current.agendar(['a']); });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(result.current.estado).toBe('negado');
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(gravar).toHaveBeenCalledTimes(1);
});

it('erros temporários voltam a tentar com espera crescente', async () => {
  const gravar = vi.fn().mockRejectedValue(new Error('rede'));
  const { result } = renderHook(() => useAutoGravar<string[]>(gravar, 500));
  act(() => { result.current.agendar(['a']); });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });   // 1.ª tentativa
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });  // 2.ª (3 s)
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });  // ainda à espera (6 s)
  expect(gravar).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });  // 3.ª
  expect(gravar).toHaveBeenCalledTimes(3);
});
