import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationSelector from './LocationSelector';

const mockSetCity = vi.fn();

vi.mock('../../hooks/useFilters', () => ({
  useFilters: () => ({
    filters: { selectedCity: '' },
    setCity: mockSetCity,
  }),
}));

vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({ isZh: false, language: 'en', toggleLanguage: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'location.all': 'All locations',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('LocationSelector', () => {
  it('renders a select element', () => {
    render(<LocationSelector />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders "All locations" as first option', () => {
    render(<LocationSelector />);
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options[0].textContent).toBe('All locations');
  });

  it('renders city optgroups', () => {
    render(<LocationSelector />);
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('calls setCity on change', async () => {
    mockSetCity.mockClear();
    const user = userEvent.setup();
    render(<LocationSelector />);

    await user.selectOptions(screen.getByRole('combobox'), 'san_jose');
    expect(mockSetCity).toHaveBeenCalledWith('san_jose');
  });

  it('renders city names in English', () => {
    render(<LocationSelector />);
    expect(screen.getByText('San Jose')).toBeInTheDocument();
  });
});
