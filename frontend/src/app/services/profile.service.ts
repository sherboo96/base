import { Injectable } from '@angular/core';
import { environment, AppProfile } from '../../environments/environment';

export interface ProfileConfig {
  id: AppProfile;
  nameEn: string;
  nameAr: string;
  systemNameEn: string;
  systemNameAr: string;
  colors: {
    primary: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    accentDarker: string;
  };
  logoPath: string;
  logoLoginPath: string; // Sometimes login has a different logo version
  loginImagePath: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private profiles: Record<AppProfile, ProfileConfig> = {
    'OTC': {
      id: 'OTC',
      nameEn: 'OTC',
      nameAr: 'مركز تدريب البترول', // Adjust based on requirement
      systemNameEn: 'OTC Management System',
      systemNameAr: 'نظام إدارة مركز تدريب البترول',
      colors: {
        primary: '#0F4C75', // Example colors for OTC - user can easily modify these
        accent: '#0B5367',
        accentLight: '#0D6B7F',
        accentDark: '#084354',
        accentDarker: '#063240',
      },
      logoPath: 'assets/images/system_logos/OTC_logo.png', // Fallback, recommend changing to 'otc-logo.png'
      logoLoginPath: 'assets/images/system_logos/OTC_logo.png',
      loginImagePath: 'assets/images/system_logos/moo.png',
    },
    'KOC_TRAINING_CENTER': {
      id: 'KOC_TRAINING_CENTER',
      nameEn: 'KOC Training Center',
      nameAr: 'مركز تدريب نفط الكويت',
      systemNameEn: 'Training Management System',
      systemNameAr: 'نظام إدارة التدريب',
      colors: {
        primary: '#0663A1', // Updated system color
        accent: '#055184',
        accentLight: '#087BC7',
        accentDark: '#044068',
        accentDarker: '#022944',
      },
      logoPath: 'assets/images/system_logos/KOC_logo.png',
      logoLoginPath: 'assets/images/system_logos/KOC_logo.png',
      loginImagePath: 'assets/images/system_logos/KOC_logo.png',
    },
    'EMS_ACADEMY': {
      id: 'EMS_ACADEMY',
      nameEn: 'EMS Academy',
      nameAr: 'أكاديمية EMS',
      systemNameEn: 'Academy Management System',
      systemNameAr: 'نظام إدارة الأكاديمية',
      colors: {
        primary: '#4CBA6B', // EMS Academy primary
        accent: '#44A860',  // Derived green accent
        accentLight: '#6CD286',
        accentDark: '#36894E',
        accentDarker: '#28693B',
      },
      logoPath: 'assets/images/system_logos/EMS_logo.png', // Change to proper ems-logo.png
      logoLoginPath: 'assets/images/system_logos/EMS_logo.png',
      loginImagePath: 'assets/images/system_logos/EMC.jpg',
    }
  };

  private activeConfig: ProfileConfig;

  constructor() {
    this.activeConfig = this.profiles[environment.activeProfile] || this.profiles['OTC'];
    this.applyProfileColors();
  }

  public getConfig(): ProfileConfig {
    return this.activeConfig;
  }

  private applyProfileColors(): void {
    const root = document.documentElement;
    // Set HEX colors (for direct usage)
    root.style.setProperty('--color-primary', this.activeConfig.colors.primary);
    root.style.setProperty('--color-accent', this.activeConfig.colors.accent);
    root.style.setProperty('--color-accent-light', this.activeConfig.colors.accentLight);
    root.style.setProperty('--color-accent-dark', this.activeConfig.colors.accentDark);
    root.style.setProperty('--color-accent-darker', this.activeConfig.colors.accentDarker);

    // Set RGB values separated by space for Tailwind opacity modifier support (e.g., bg-primary/10)
    root.style.setProperty('--color-primary-rgb', this.hexToRgb(this.activeConfig.colors.primary));
    root.style.setProperty('--color-accent-rgb', this.hexToRgb(this.activeConfig.colors.accent));
    root.style.setProperty('--color-accent-light-rgb', this.hexToRgb(this.activeConfig.colors.accentLight));
    root.style.setProperty('--color-accent-dark-rgb', this.hexToRgb(this.activeConfig.colors.accentDark));
    root.style.setProperty('--color-accent-darker-rgb', this.hexToRgb(this.activeConfig.colors.accentDarker));
  }

  private hexToRgb(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b values
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `${r} ${g} ${b}`;
  }
}
