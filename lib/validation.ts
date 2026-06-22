import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Mínimo de 3 caracteres')
  .max(30, 'Máximo de 30 caracteres')
  .regex(/^[a-z0-9_.]+$/, 'Só letras minúsculas, números, _ ou .');

export const fullNameSchema = z
  .string()
  .min(2, 'Nome muito curto')
  .max(120, 'Nome muito longo')
  .trim();

export const emailSchema = z.string().email('Email inválido').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .max(72, 'Máximo de 72 caracteres');

export const handleSchema = z
  .string()
  .max(100, 'Máximo de 100 caracteres')
  .regex(/^@?[a-zA-Z0-9._-]+$/, 'Handle inválido')
  .nullable()
  .or(z.literal(''))
  .transform((v) => (v ? v.replace(/^@/, '') : null));

export const urlSchema = z.string().url('URL inválida').max(2048);

export const signupSchema = z.object({
  full_name: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const profileSocialsSchema = z.object({
  instagram: handleSchema,
  linkedin: handleSchema,
  facebook: handleSchema,
  tiktok: handleSchema,
  youtube: handleSchema,
  threads: handleSchema,
});

export const networkSchema = z.enum(['instagram', 'linkedin', 'facebook', 'tiktok', 'youtube', 'threads', 'x']);

export const postSchema = z.object({
  title: z.string().min(3, 'Título muito curto').max(200, 'Título muito longo'),
  description: z.string().max(2000).nullable().optional(),
  network: networkSchema,
  original_url: urlSchema,
  published_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida'),
  cover_url: z.string().url().nullable().optional(),
  is_active: z.boolean(),
});

export const checkinDeclareSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  action: z.enum(['like', 'comment', 'share']),
});

export const checkinDecideSchema = z.object({
  checkin_id: z.string().uuid('Check-in inválido'),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(500).nullable().optional(),
});

export const userToggleSchema = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});

export const postReactionKindSchema = z.enum(['fire', 'muscle', 'clap', 'raised', 'laugh']);
export const postReactionSetSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  reaction: postReactionKindSchema,
});
export const postCommentSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  body: z.string().min(1, 'Comentário vazio').max(500, 'Máximo de 500 caracteres').trim(),
});

export const checkinReactionKindSchema = z.enum(['clap']);
export const checkinReactionSetSchema = z.object({
  checkin_id: z.string().uuid('Check-in inválido'),
  reaction: checkinReactionKindSchema,
});
export const checkinCommentSchema = z.object({
  checkin_id: z.string().uuid('Check-in inválido'),
  body: z.string().min(1, 'Comentário vazio').max(300, 'Máximo de 300 caracteres').trim(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileSocialsInput = z.infer<typeof profileSocialsSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CheckinDeclareInput = z.infer<typeof checkinDeclareSchema>;
export type CheckinDecideInput = z.infer<typeof checkinDecideSchema>;
export type UserToggleInput = z.infer<typeof userToggleSchema>;
export type PostReactionSetInput = z.infer<typeof postReactionSetSchema>;
export type PostCommentInput = z.infer<typeof postCommentSchema>;
export type CheckinReactionSetInput = z.infer<typeof checkinReactionSetSchema>;
export type CheckinCommentInput = z.infer<typeof checkinCommentSchema>;