import { User } from './user.model';
import { System } from './system.model';

export interface UserSystem {
  id?: number;
  userId: number;
  user?: User;
  systemId: number;
  system?: System;
  accessLevel: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdOn?: string;
}
