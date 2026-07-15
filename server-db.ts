import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, UserRole, ConstructionSite, Material, ConstructionParameter, TeamMessage, Blueprint, WorkerRegistry } from './src/types';

interface DBUser extends User {
  passwordHash: string;
  salt: string;
}

interface DatabaseSchema {
  users: DBUser[];
  sites: ConstructionSite[];
  materials: Material[];
  parameters: ConstructionParameter[];
  messages: TeamMessage[];
  blueprints: Blueprint[];
  workers: WorkerRegistry[];
}

const DB_FILE = path.join(process.cwd(), 'data.json');

// Helper to initialize database if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      sites: [],
      materials: [],
      parameters: [],
      messages: [],
      blueprints: [],
      workers: []
    };
    
    // Add default engineer account for setup/testing (login: engenheiro, senha: 123)
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword('123', salt);
    initialData.users.push({
      id: crypto.randomUUID(),
      username: 'engenheiro',
      name: 'Eng. Roberto Silva',
      role: 'engineer',
      passwordHash,
      salt
    });

    // Add default mestre de obra (login: mestre, senha: 123)
    const salt2 = crypto.randomBytes(16).toString('hex');
    const passwordHash2 = hashPassword('123', salt2);
    initialData.users.push({
      id: crypto.randomUUID(),
      username: 'mestre',
      name: 'Mestre Sebastião',
      role: 'master_builder',
      passwordHash: passwordHash2,
      salt: salt2
    });

    // Add default supervisor (login: encarregado, senha: 123)
    const salt3 = crypto.randomBytes(16).toString('hex');
    const passwordHash3 = hashPassword('123', salt3);
    initialData.users.push({
      id: crypto.randomUUID(),
      username: 'encarregado',
      name: 'Encarregado Marcos (Hidráulica)',
      role: 'supervisor',
      passwordHash: passwordHash3,
      salt: salt3
    });

    // Save initial data safely
    writeDBSync(initialData);
  }
}

// Password hashing function using PBKDF2
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Safe database reading
export function readDB(): DatabaseSchema {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.workers) {
      parsed.workers = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file, using fallback empty state:', err);
    return {
      users: [],
      sites: [],
      materials: [],
      parameters: [],
      messages: [],
      blueprints: [],
      workers: []
    };
  }
}

// Safe atomic database writing
export function writeDB(data: DatabaseSchema): void {
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to write database atomically, attempting direct write:', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (directErr) {
      console.error('Critical Error: Failed to write database directly!', directErr);
    }
  }
}

// Direct synchronous write for initializer
function writeDBSync(data: DatabaseSchema): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}
