import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageToggle from './LanguageToggle';

const mockToggleLanguage = vi.fn();
let mockLanguage = 'zh';

vi.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: mockLanguage,
    isZh: mockLanguage === 'zh',
    toggleLanguage: mockToggleLanguage,
  }),
}));

describe('LanguageToggle', () => {
  it('renders EN and 中文 labels', () => {
    render(<LanguageToggle />);
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('中文')).toBeInTheDocument();
  });

  it('highlights zh when language is zh', () => {
    mockLanguage = 'zh';
    render(<LanguageToggle />);
    const zhSpan = screen.getByText('中文');
    expect(zhSpan.className).toContain('font-bold');
  });

  it('highlights en when language is en', () => {
    mockLanguage = 'en';
    render(<LanguageToggle />);
    const enSpan = screen.getByText('EN');
    expect(enSpan.className).toContain('font-bold');
  });

  it('calls toggleLanguage on click', async () => {
    mockToggleLanguage.mockClear();
    const user = userEvent.setup();
    render(<LanguageToggle />);

    await user.click(screen.getByRole('button'));
    expect(mockToggleLanguage).toHaveBeenCalledOnce();
  });
});
