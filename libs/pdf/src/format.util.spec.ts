import { describe, it, expect } from '@jest/globals';
import {
  toArabicIndic,
  formatDateShort,
  formatTime,
  formatMoney,
  genderLabel,
  normalizeCurrency,
} from './format.util';

describe('format.util', () => {
  describe('toArabicIndic', () => {
    it('converts western digits to Arabic-Indic', () => {
      expect(toArabicIndic(1234)).toBe('١٢٣٤');
      expect(toArabicIndic('08:30')).toBe('٠٨:٣٠');
    });

    it('returns the dash placeholder for empty values', () => {
      expect(toArabicIndic(null)).toBe('—');
      expect(toArabicIndic('')).toBe('—');
    });
  });

  describe('formatDateShort', () => {
    it('formats a date as dd / mm / yyyy in Arabic-Indic', () => {
      const d = new Date(2026, 8, 5); // 2026-09-05
      expect(formatDateShort(d)).toBe('٠٥ / ٠٩ / ٢٠٢٦');
    });

    it('returns a placeholder when no date is given', () => {
      expect(formatDateShort(null)).toBe('—');
    });
  });

  describe('formatTime', () => {
    it('formats "HH:MM" strings with Arabic-Indic digits and ص/م period', () => {
      expect(formatTime('08:00')).toBe('٠٨:٠٠ ص');
      expect(formatTime('14:30')).toBe('٠٢:٣٠ م');
    });

    it('accepts Date instances', () => {
      const d = new Date(2026, 8, 5, 15, 5);
      expect(formatTime(d)).toBe('٠٣:٠٥ م');
    });
  });

  describe('formatMoney', () => {
    it('formats amount with Arabic-Indic digits and the default currency', () => {
      expect(formatMoney(250)).toBe('٢٥٠٫٠٠ جنيه سوداني');
    });

    it('supports a custom currency', () => {
      expect(formatMoney(500, '$')).toBe('٥٠٠٫٠٠ $');
    });

    it('returns a placeholder for empty amounts', () => {
      expect(formatMoney(null)).toBe('—');
    });
  });

  describe('normalizeCurrency', () => {
    it('maps legacy ISO code SDG to the Arabic store label', () => {
      expect(normalizeCurrency('SDG')).toBe('جنيه سوداني');
      expect(normalizeCurrency(' sdg ')).toBe('جنيه سوداني');
    });

    it('keeps the canonical Arabic label unchanged', () => {
      expect(normalizeCurrency('جنيه سوداني')).toBe('جنيه سوداني');
    });

    it('defaults when missing', () => {
      expect(normalizeCurrency(undefined)).toBe('جنيه سوداني');
      expect(normalizeCurrency(null)).toBe('جنيه سوداني');
    });

    it('passes unknown labels through', () => {
      expect(normalizeCurrency('$')).toBe('$');
    });
  });

  describe('genderLabel', () => {
    it('maps gender codes to Arabic labels', () => {
      expect(genderLabel('MALE')).toBe('ذكر');
      expect(genderLabel('female')).toBe('أنثى');
      expect(genderLabel('M')).toBe('ذكر');
      expect(genderLabel('F')).toBe('أنثى');
    });

    it('falls back to the raw value or placeholder', () => {
      expect(genderLabel('مجهول')).toBe('مجهول');
      expect(genderLabel(undefined)).toBe('—');
    });
  });
});
