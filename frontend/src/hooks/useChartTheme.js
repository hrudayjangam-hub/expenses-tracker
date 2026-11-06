import { useTheme } from '../context/ThemeContext';

export const PALETTE = {
  income: '#10b981',
  expense: '#f43f5e',
  balance: '#3b82f6',
  savings: '#8b5cf6',
  amber: '#f59e0b',
  sky: '#0ea5e9',
};

export default function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    dark,
    grid: dark ? '#1f2a44' : '#e7ebf3',
    axis: dark ? '#7785a6' : '#57658a',
    tooltipBg: dark ? '#141d33' : '#ffffff',
    tooltipBorder: dark ? '#1f2a44' : '#e7ebf3',
    tooltipText: dark ? '#f4f6fa' : '#0a1020',
    mutedFill: dark ? '#1f2a44' : '#f4f6fa',
  };
}
