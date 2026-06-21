import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children and applies variant class', () => {
    render(<Button variant="destructive">Excluir</Button>);
    const btn = screen.getByRole('button', { name: 'Excluir' });
    expect(btn).toHaveClass('bg-state-error');
  });
  it('shows spinner when loading and is disabled', () => {
    render(<Button loading>Enviar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('span[aria-hidden]')).toBeInTheDocument();
  });
});