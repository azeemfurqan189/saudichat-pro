import { Prisma } from '@prisma/client';
import { SCHEMA_NOT_READY_MESSAGE } from '../db/syncSchema';

export function isSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('does not exist') ||
    lower.includes('column') ||
    lower.includes('agencyproject') ||
    lower.includes('clientcompany') ||
    lower.includes('relation') ||
    lower.includes('p2010') ||
    lower.includes('p2021')
  );
}

export function formatPrismaError(err: unknown): { status: number; message: string } {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2003':
        return {
          status: 400,
          message: 'Client or manager not found — refresh the page and select again',
        };
      case 'P2002':
        return { status: 409, message: 'A record with this value already exists' };
      case 'P2021':
      case 'P2010':
        return { status: 503, message: SCHEMA_NOT_READY_MESSAGE };
      default:
        break;
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  if (isSchemaError(msg)) {
    return { status: 503, message: SCHEMA_NOT_READY_MESSAGE };
  }

  return {
    status: 500,
    message: process.env.NODE_ENV === 'development' ? msg : 'Internal server error',
  };
}
