import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils';
import { TouchButton } from '@/components/ui/TouchButton';

describe('TouchButton — variants', () => {
  const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'ghost'] as const;

  for (const variant of variants) {
    it(`renders ${variant} variant without crashing`, () => {
      renderWithProviders(<TouchButton variant={variant}>Click</TouchButton>);
      expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
    });
  }
});

describe('TouchButton — click handling', () => {
  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(<TouchButton onClick={handleClick}>Press</TouchButton>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('TouchButton — loading state', () => {
  it('is disabled and does not fire onClick when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(<TouchButton loading onClick={handleClick}>Save</TouchButton>);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('TouchButton — disabled state', () => {
  it('is disabled and does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(<TouchButton disabled onClick={handleClick}>Delete</TouchButton>);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('TouchButton — touch target sizes', () => {
  it('md size has min-h-[44px] class (≥44px touch target)', () => {
    renderWithProviders(<TouchButton size="md">Touch</TouchButton>);
    expect(screen.getByRole('button').className).toContain('min-h-[44px]');
  });

  it('lg size has min-h-[52px] class', () => {
    renderWithProviders(<TouchButton size="lg">Large</TouchButton>);
    expect(screen.getByRole('button').className).toContain('min-h-[52px]');
  });

  it('xl size has min-h-[60px] class', () => {
    renderWithProviders(<TouchButton size="xl">XL</TouchButton>);
    expect(screen.getByRole('button').className).toContain('min-h-[60px]');
  });
});
