import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatArea(area: number, unit: string) {
  return `${area.toFixed(2)} ${unit}`;
}

export function formatDate(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function getConfidenceBadgeClass(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  if (percentage >= 90) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (percentage >= 70) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export function getConfidenceLabel(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  if (percentage >= 90) return 'High Confidence';
  if (percentage >= 70) return 'Medium Confidence';
  return 'Low Confidence (Review Required)';
}
