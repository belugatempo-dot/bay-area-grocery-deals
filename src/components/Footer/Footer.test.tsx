import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'footer.disclaimer': 'Prices may vary by location.',
        'footer.madeWith': 'Made with React',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('Footer', () => {
  it('renders disclaimer text', () => {
    render(<Footer />);
    expect(screen.getByText('Prices may vary by location.')).toBeInTheDocument();
  });

  it('renders madeWith text', () => {
    render(<Footer />);
    expect(screen.getByText('Made with React')).toBeInTheDocument();
  });
});
