export interface User {
  id: number;
  fullName: string;
  email: string;
  adUsername: string;
  positionId: number;
  lastLogin?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdOn?: string;
  updatedBy?: string;
}
