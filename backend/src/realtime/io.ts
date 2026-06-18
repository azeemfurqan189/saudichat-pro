import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketIo(io: Server): void {
  ioInstance = io;
}

export function getSocketIo(): Server | null {
  return ioInstance;
}

export function emitToBusiness(businessId: string, event: string, payload: unknown): void {
  ioInstance?.to(`business:${businessId}`).emit(event, payload);
}
