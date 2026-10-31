import { useEffect, useSyncExternalStore } from 'react';
import type { UpdateManager, UpdateSnapshot } from '../lib/appUpdate';
import { getAppUpdateManager } from '../lib/appUpdateRuntime';

const IDLE: UpdateSnapshot = { visible: false, applying: false };
const noopSubscribe = () => () => {};

/** Liga a checagem de versão e expõe o estado do aviso "Nova versão disponível". */
export function useAppUpdate(managerOverride?: UpdateManager | null) {
  const manager = managerOverride === undefined ? getAppUpdateManager() : managerOverride;

  useEffect(() => {
    if (!manager) return undefined;
    manager.start();
    return () => manager.stop();
  }, [manager]);

  const snapshot = useSyncExternalStore(
    manager ? manager.subscribe : noopSubscribe,
    manager ? manager.getSnapshot : () => IDLE,
    () => IDLE,
  );

  return {
    ...snapshot,
    apply: () => void manager?.apply(),
    dismiss: () => manager?.dismiss(),
  };
}
