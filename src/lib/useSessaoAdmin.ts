import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';

export type EstadoAdmin = 'carregando' | 'fora' | 'admin' | 'semPermissao';

export function useSessaoAdmin(): EstadoAdmin {
  const [estado, setEstado] = useState<EstadoAdmin>('carregando');
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user || user.isAnonymous) return setEstado('fora');
        setEstado('carregando');
        try {
          const s = await getDoc(doc(db, 'admins', user.uid));
          setEstado(s.exists() ? 'admin' : 'semPermissao');
        } catch {
          setEstado('semPermissao');
        }
      }),
    [],
  );
  return estado;
}
