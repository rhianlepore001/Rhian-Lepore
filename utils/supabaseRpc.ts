interface RpcErrorShape {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function isMissingRpcError(error: unknown): boolean {
  const raw = (error && typeof error === 'object' ? error : {}) as RpcErrorShape;
  const code = String(raw.code ?? '');
  const blob = `${raw.message ?? ''} ${raw.details ?? ''} ${raw.hint ?? ''}`.toLowerCase();
  return (
    code === 'PGRST202'
    || code === '42883'
    || blob.includes('could not find the function')
    || blob.includes('function') && blob.includes('does not exist')
  );
}

export function rpcErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as RpcErrorShape).message ?? '');
  }
  return String(error ?? '');
}

export function isSlotUnavailableError(error: unknown): boolean {
  return rpcErrorMessage(error).toLowerCase().includes('slot_unavailable');
}
