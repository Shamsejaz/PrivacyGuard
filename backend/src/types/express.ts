import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}