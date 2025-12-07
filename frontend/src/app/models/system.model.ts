export interface System {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  isDeleted: boolean;
  createdOn?: string;
}
