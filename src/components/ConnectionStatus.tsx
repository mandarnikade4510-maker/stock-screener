'use client';
import type { ConnectionStatus as S } from '@/lib/socket';
const LABEL: Record<S, string> = { connected: 'Live', connecting: 'Connecting', reconnecting: 'Reconnecting', disconnected: 'Disconnected' };
const COLOR: Record<S, string> = { connected: 'green', connecting: 'yellow', reconnecting: 'yellow', disconnected: 'red' };
export function ConnectionStatus({ status }: { status: S }) {
  return <span role="status" aria-label={`Price feed: ${LABEL[status]}`} className="conn"><i className={`dot ${COLOR[status]}`} aria-hidden />{LABEL[status]}</span>;
}
