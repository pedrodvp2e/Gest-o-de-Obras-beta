/**
 * API Configuration
 * Centralizes all API endpoints and handles environment-based configuration
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_CONFIG = {
  baseURL: API_URL,
  
  // Auth endpoints
  auth: {
    login: `${API_URL}/api/auth/login`,
    register: `${API_URL}/api/auth/register`,
    me: `${API_URL}/api/auth/me`,
  },
  
  // Sites endpoints
  sites: {
    list: `${API_URL}/api/sites`,
    create: `${API_URL}/api/sites`,
    get: (id: string) => `${API_URL}/api/sites/${id}`,
    delete: (id: string) => `${API_URL}/api/sites/${id}`,
  },
  
  // Materials endpoints
  materials: {
    list: (siteId: string) => `${API_URL}/api/sites/${siteId}/materials`,
    create: (siteId: string) => `${API_URL}/api/sites/${siteId}/materials`,
    update: (siteId: string, materialId: string) => `${API_URL}/api/sites/${siteId}/materials/${materialId}`,
    delete: (siteId: string, materialId: string) => `${API_URL}/api/sites/${siteId}/materials/${materialId}`,
    estimate: (siteId: string) => `${API_URL}/api/sites/${siteId}/materials/estimate`,
  },
  
  // Parameters (stages) endpoints
  parameters: {
    list: (siteId: string) => `${API_URL}/api/sites/${siteId}/parameters`,
    create: (siteId: string) => `${API_URL}/api/sites/${siteId}/parameters`,
    update: (siteId: string, parameterId: string) => `${API_URL}/api/sites/${siteId}/parameters/${parameterId}`,
    delete: (siteId: string, parameterId: string) => `${API_URL}/api/sites/${siteId}/parameters/${parameterId}`,
  },
  
  // Blueprints endpoints
  blueprints: {
    list: (siteId: string) => `${API_URL}/api/sites/${siteId}/blueprints`,
    create: (siteId: string) => `${API_URL}/api/sites/${siteId}/blueprints`,
    delete: (siteId: string, blueprintId: string) => `${API_URL}/api/sites/${siteId}/blueprints/${blueprintId}`,
  },
  
  // Messages endpoints
  messages: {
    list: (siteId: string) => `${API_URL}/api/sites/${siteId}/messages`,
    send: (siteId: string) => `${API_URL}/api/sites/${siteId}/messages`,
  },
  
  // Workers endpoints
  workers: {
    list: (siteId: string) => `${API_URL}/api/sites/${siteId}/workers`,
    create: (siteId: string) => `${API_URL}/api/sites/${siteId}/workers`,
    delete: (siteId: string, workerId: string) => `${API_URL}/api/sites/${siteId}/workers/${workerId}`,
  },
  
  // Users endpoints
  users: {
    list: `${API_URL}/api/users`,
  }
};

export function getAuthHeader(token: string | null): HeadersInit {
  if (!token) {
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
