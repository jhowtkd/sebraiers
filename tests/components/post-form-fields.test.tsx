import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { PostFormFields } from '@/components/forms/post-form-fields';
import type { PostInput } from '@/lib/validation';

function Harness() {
  const { register } = useForm<PostInput>();
  return <PostFormFields register={register} />;
}

describe('PostFormFields', () => {
  it('exposes cover_file with a name so native FormData includes the upload', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/imagem de capa/i);
    expect(input).toHaveAttribute('name', 'cover_file');
    expect(input).toHaveAttribute('type', 'file');
  });
});
