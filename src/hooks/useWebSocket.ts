'use client';
import { useEffect, useRef, useState } from 'react';
import { ReconnectingSocket, createSimTransport, type ConnectionStatus } from '@/lib/socket';
import { PriceSimulator } from '@/lib/priceSimulator';
import { UNIVERSE } from '@/lib/universe';
import { useStockStore } from '@/stores/stockStore';
import { useOnlineStatus } from './useOnlineStatus';

/** Owns the socket lifecycle, feeds batched updates to the store, and reacts to the browser going offline/online. */
export function useWebSocket(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const batch = useStockStore(s => s.batchUpdatePrices); const online = useOnlineStatus(); const ref = useRef<ReconnectingSocket | null>(null);
  useEffect(() => {
    const sim = new PriceSimulator(UNIVERSE); const sock = new ReconnectingSocket(() => createSimTransport(sim));
    ref.current = sock; const offS = sock.onStatus(setStatus); const offU = sock.onUpdates(batch); sock.connect();
    return () => { offS(); offU(); sock.disconnect(); ref.current = null; };
  }, [batch]);
  useEffect(() => { const s = ref.current; if (!s) return; if (!online) s.disconnect(); else if (s.status === 'disconnected') s.reconnectNow(); }, [online]);
  return status;
}
