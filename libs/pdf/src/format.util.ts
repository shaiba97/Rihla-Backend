/**
 * Pure formatting helpers used by the PDFMake document builders. Verified to
 * be safe per-glyph: the glyphs used (Arabic letters, digits, separators)
 * are all present in Tajawal.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

export function toArabicIndic(num: any): string {
  if (num == null || num === '') return '—';
  return String(num).replace(/[0-9]/g, (d) => ARABIC_INDIC[+d]);
}

export function formatDateShort(val: any): string {
  if (!val) return '—';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = toArabicIndic(String(d.getDate()).padStart(2, '0'));
  const mm = toArabicIndic(String(d.getMonth() + 1).padStart(2, '0'));
  const yy = toArabicIndic(String(d.getFullYear()));
  return `${dd} / ${mm} / ${yy}`;
}

export function formatTime(val: any): string {
  if (!val) return '—';
  let h: number, m: number;
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
    [h, m] = val.split(':').map(Number);
  } else {
    const d = val instanceof Date ? val : new Date(val);
    h = d.getHours();
    m = d.getMinutes();
  }
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${toArabicIndic(String(h12).padStart(2, '0'))}:${toArabicIndic(
    String(m).padStart(2, '0'),
  )} ${period}`;
}

export function formatMoney(amount: any, currency = 'جنيه سوداني'): string {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  const fixed = n.toFixed(2).replace('.', '٫');
  return `${toArabicIndic(fixed)} ${currency}`;
}

export function genderLabel(g: any): string {
  const map: Record<string, string> = {
    MALE: 'ذكر',
    FEMALE: 'أنثى',
    male: 'ذكر',
    female: 'أنثى',
    M: 'ذكر',
    F: 'أنثى',
  };
  return map[g] || g || '—';
}
