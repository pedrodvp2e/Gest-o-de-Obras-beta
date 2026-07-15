export type UserRole = 'engineer' | 'master_builder' | 'supervisor' | 'worker';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  teamId?: string;
}

export interface ConstructionSite {
  id: string;
  name: string;
  location: string;
  clientName: string;
  clientPhone: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'ongoing' | 'paused' | 'completed';
  percentage: number; // overall development percentage
}

export interface Material {
  id: string;
  siteId: string;
  name: string;
  quantityNeeded: number;
  quantityReceived: number;
  unit: string; // e.g., 'm³', 'sacos', 'kg', 'm', 'unidades'
  updatedAt: string;
  updatedBy: string;
  guests?: string[]; // list of guests/guests names allowed to view/receive
}

export interface ConstructionParameter {
  id: string;
  siteId: string;
  name: string; // e.g., 'Hidráulica', 'Reboco de Parede', 'Fundação', 'Elétrica', 'Pintura'
  status: 'pending' | 'ongoing' | 'completed';
  percentage: number; // percentage of development (0 - 100)
  deadline: string;
  assignedToName: string; // Name of mestre/supervisor or team
  timerDuration: number; // total elapsed time in seconds
  timerRunning: boolean;
  timerStartedAt?: number; // timestamp in ms when timer was last started
}

export interface TeamMessage {
  id: string;
  siteId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string; // ISO string
}

export interface Blueprint {
  id: string;
  siteId: string;
  title: string;
  description: string;
  fileData: string; // Base64 data URL
  uploadedBy: string;
  uploadedAt: string;
}

export interface WorkerRegistry {
  id: string;
  siteId: string;
  name: string;
  role: string; // e.g., 'Pedreiro', 'Servente', 'Pintor', 'Eletricista'
  phone: string;
  cpf: string;
  status: 'active' | 'pending';
  registeredBy: string;
  registeredAt: string;
}

