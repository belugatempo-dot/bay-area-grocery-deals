import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DealModal from './DealModal';

describe('DealModal', () => {
  it('renders null (skeleton placeholder)', () => {
    const { container } = render(<DealModal />);
    expect(container.innerHTML).toBe('');
  });
});
