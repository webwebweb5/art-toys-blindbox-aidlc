import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

    socket = io(WS_URL, {
      autoConnect: false,
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onEvent<T>(event: string, callback: (data: T) => void): () => void {
  const s = getSocket();
  s.on(event, callback);
  return () => {
    s.off(event, callback);
  };
}

export function emitEvent(event: string, data?: unknown): void {
  const s = getSocket();
  s.emit(event, data);
}
