export type AppProfile = 'OTC' | 'KOC_TRAINING_CENTER' | 'EMS_ACADEMY';

export const environment = {
  production: false,
  baseUrl: 'http://localhost:5148/api',
  encryptionKey: 'MOOP@ssw0rd20242025', // Change this in production
  activeProfile: 'OTC' as AppProfile
};
