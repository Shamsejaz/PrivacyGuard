export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}