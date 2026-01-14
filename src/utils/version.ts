import { Request } from 'express';
import semver from 'semver';

export const checkVersion = (req: Request): { valid: boolean; message?: string } => {
  const minVersion = process.env.MIN_CLIENT_VERSION || '0.0.0';
  const clientVersion = req.headers['x-client-version'] as string;

  // Si no hay versión mínima configurada o es 0.0.0, permitimos todo (modo dev/legacy)
  if (minVersion === '0.0.0') return { valid: true };

  // Si el cliente no envía versión y requerimos una mayor a 0.0.0
  if (!clientVersion) {
    return { 
      valid: false, 
      message: 'Client version header missing. Please update your app.' 
    };
  }

  // Validar formato de versión (semver limpio)
  const cleanClientVersion = semver.clean(clientVersion);
  if (!cleanClientVersion) {
     // Si no es válida, asumimos que es muy vieja o inválida
     return { valid: false, message: 'Invalid client version.' };
  }

  if (semver.lt(cleanClientVersion, minVersion)) {
    return { 
      valid: false, 
      message: `App version ${minVersion} or higher is required. You are using ${clientVersion}.` 
    };
  }

  return { valid: true };
};
