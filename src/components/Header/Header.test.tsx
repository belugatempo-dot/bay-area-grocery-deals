import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './Header';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.title': 'Bay Area Grocery Deals',
        'app.tagline': 'Best deals near you',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock child components to isolate Header
vi.mock('./LanguageToggle', () => ({
  default: () => <div data-testid="language-toggle" />,
}));

vi.mock('./LocationSelector', () => ({
  default: () => <div data-testid="location-selector" />,
}));

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText('Bay Area Grocery Deals')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<Header />);
    expect(screen.getByText('Best deals near you')).toBeInTheDocument();
  });

  it('renders LocationSelector', () => {
    render(<Header />);
    expect(screen.getByTestId('location-selector')).toBeInTheDocument();
  });

  it('renders LanguageToggle', () => {
    render(<Header />);
    expect(screen.getByTestId('language-toggle')).toBeInTheDocument();
  });
});
