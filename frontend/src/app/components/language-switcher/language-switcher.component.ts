import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button
        type="button"
        (click)="toggleLanguage()"
        class="lang-switcher-btn"
        [attr.aria-label]="currentLang === 'en' ? 'Switch to Arabic' : 'Switch to English'"
        [attr.dir]="currentLang === 'ar' ? 'rtl' : 'ltr'"
      >
        <div class="lang-icon-wrapper">
          <i class="fas fa-globe lang-icon"></i>
        </div>
        <div class="lang-arrow-wrapper">
          <i class="fas fa-exchange-alt lang-arrow"></i>
        </div>
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
    }

    .lang-switcher-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
      border: 1.5px solid #e5e7eb;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 110px;
      justify-content: center;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }

    .lang-switcher-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(11, 83, 103, 0.1), transparent);
      transition: left 0.5s;
    }

    .lang-switcher-btn:hover::before {
      left: 100%;
    }

    .lang-switcher-btn:hover {
      border-color: #0B5367;
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transform: translateY(-1px);
    }

    .lang-switcher-btn:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .lang-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .lang-icon {
      font-size: 0.875rem;
      color: #0B5367;
      transition: transform 0.3s ease;
    }

    .lang-switcher-btn:hover .lang-icon {
      transform: rotate(15deg) scale(1.1);
      color: #084354;
    }

    .lang-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
      transition: color 0.2s ease;
    }

    .lang-switcher-btn:hover .lang-text {
      color: #0B5367;
    }

    .lang-arrow-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
    }

    .lang-arrow {
      font-size: 0.75rem;
      color: #9ca3af;
      transition: all 0.3s ease;
    }

    .lang-switcher-btn:hover .lang-arrow {
      color: #0B5367;
      transform: rotate(180deg);
    }

    /* RTL Support */
    .lang-switcher-btn[dir="rtl"] {
      direction: rtl;
    }

    html[dir="rtl"] .lang-switcher-btn,
    .rtl .lang-switcher-btn {
      direction: rtl;
    }

    /* Animation for language change */
    .lang-text {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Focus styles for accessibility */
    .lang-switcher-btn:focus {
      outline: none;
      ring: 2px;
      ring-color: #0B5367;
      ring-opacity: 0.3;
    }

    .lang-switcher-btn:focus-visible {
      outline: 2px solid #0B5367;
      outline-offset: 2px;
    }
  `]
})
export class LanguageSwitcherComponent implements OnInit {
  currentLang: 'en' | 'ar' = 'en';

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    this.currentLang = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang as 'en' | 'ar';
    });
  }

  toggleLanguage(): void {
    const newLang = this.currentLang === 'en' ? 'ar' : 'en';
    this.translationService.setLanguage(newLang);
  }
}

