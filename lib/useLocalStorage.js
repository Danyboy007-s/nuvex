import { useCallback, useSyncExternalStore } from "react";

// Lee y escribe un valor de texto en localStorage como si fuera estado de React.
//
// Usa useSyncExternalStore (lo que recomienda React 19 para datos "de afuera"):
//   - en el servidor y en el primer render devuelve `fallback`, así el HTML
//     coincide y no hay errores de hidratación;
//   - luego lee el valor guardado, sin un setState dentro de un useEffect;
//   - todos los componentes que usan la misma clave se enteran al cambiarla
//     (y también otras pestañas, con el evento "storage").
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

export function useLocalStorage(key, fallback = null) {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);

  const setValue = useCallback(
    (next) => {
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* sin almacenamiento: el cambio solo dura esta visita */
      }
      listeners.forEach((l) => l());
    },
    [key]
  );

  return [value ?? fallback, setValue];
}
