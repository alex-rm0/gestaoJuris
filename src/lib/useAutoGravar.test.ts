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
