# SEBRAEIERS — Onboarding Tours (colaborador + admin)

**Data:** 2026-07-07
**Versão:** 1.0
**Status:** Aprovado para implementação

## 1. Resumo

Dois tours in-app que guiam o usuário na primeira vez que ele usa o SEBRAEIERS — um para colaboradores e outro para administradores. Tours são overlays não-bloqueantes (driver.js) com popovers posicionados via `data-tour` attributes. Conclusão é pulável e persistida em `profiles.onboarded_at` e `profiles.admin_onboarded_at`. Tours podem ser reabertos sob demanda via botão "Rever tour".

**Fora de escopo:** rotas dedicadas de onboarding, coleta de dados novos no tour, tours por feature/condicional, métricas de conclusão, i18n.

## 2. Decisões travadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Tipo de onboarding | Tours in-app (não rotas) | Combina com o tom "30 segundos por dia" do `PRODUCT.md`; não atrapalha login |
| Stack do tour | driver.js | Spotlight robusto + tema customizável via CSS vars que casam com `tokens.css` |
| Onde persistir | 2 colunas em `profiles` (`onboarded_at`, `admin_onboarded_at`) | Simples, próximo do dado de auth, sem tabela nova |
| Quem vê o tour admin | Quem tem `is_admin = true` E `admin_onboarded_at IS NULL` | Tour aparece na primeira visita a `/admin/*`, não no login |
| Quem vê o tour colaborador | Qualquer logado com `onboarded_at IS NULL` | Aparece na primeira visita a `/timeline` |
| Pular tour | Permitido em qualquer step; marca flag correspondente | Decisão de UX confirmada com usuário; persistência é o requisito |
| Rever tour | Botão em `/meu-desempenho` (colaborador) e `/admin` (admin) | Pontos de entrada naturais onde o usuário já pensa em progresso |
| Feature flag | Sem flag — liga direto | Aditivo, pulável, rollback trivial via migration |

## 3. Modelo de dados

### 3.1 Migration `0014_onboarding_flags.sql`

```sql
-- Adiciona flags de onboarding por role em profiles.
alter table public.profiles
  add column if not exists onboarded_at timestamptz null,
  add column if not exists admin_onboarded_at timestamptz null;

comment on column public.profiles.onboarded_at is
  'Quando o usuário concluiu (ou pulou) o tour de colaborador. NULL = ainda não viu.';
comment on column public.profiles.admin_onboarded_at is
  'Quando o usuário concluiu (ou pulou) o tour de admin. NULL = ainda não viu (relevante apenas se is_admin=true).';

-- Política de self-update dos flags de onboarding.
-- A migration 0002 já protege is_admin/is_active via trigger protect_admin_fields.
-- Esta policy libera o update do próprio id (cobertura para as novas colunas).
drop policy if exists profiles_self_onboarded_update on public.profiles;
create policy profiles_self_onboarded_update
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

> **Verificação antes de aplicar:** confirmar que `profiles_update_self` na migration 0001 não entra em conflito. Se já existir policy `for update` com `using (auth.uid() = id)`, esta nova é redundante e deve ser descartada (manter a existente).

### 3.2 Comportamento esperado dos flags

| Estado | Significado |
|---|---|
| `onboarded_at = NULL` | Colaborador ainda não viu/pulou o tour. Tour dispara na próxima visita a `/timeline`. |
| `onboarded_at = now()` | Colaborador concluiu ou pulou. Tour não dispara. |
| `admin_onboarded_at = NULL` + `is_admin = true` | Admin ainda não viu/pulou o tour. Tour dispara na próxima visita a `/admin/*`. |
| `admin_onboarded_at = NULL` + `is_admin = false` | Flag irrelevante; ignorado pelo layout. |

"Rever tour" seta o flag correspondente para `NULL` via server action.

## 4. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│ Server (Next.js App Router)                                     │
│  app/(app)/layout.tsx     ← lê profile.onboarded_at             │
│  app/(admin)/admin/layout.tsx ← lê profile.admin_onboarded_at   │
│  app/actions/onboarding.ts ← markOnboarded / resetOnboarded     │
└─────────────────┬───────────────────────────────────────────────┘
                  │ passa shouldStart + role pro provider
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Client (React)                                                  │
│  components/onboarding/onboarding-provider.tsx                  │
│    ├── useState steps[], currentStep                            │
│    ├── useEffect instancia driver.js quando shouldStart         │
│    ├── onFinish / onSkip → server action markOnboarded          │
│  components/onboarding/onboarding-host.tsx                      │
│    └── renderiza popover driver.js com tema tokens.css          │
└─────────────────┬───────────────────────────────────────────────┘
                  │ driver.js posiciona popovers pelos seletores
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ DOM (data-tour attributes nos componentes existentes)            │
│  [data-tour="timeline-header"]    [data-tour="timeline-card"]   │
│  [data-tour="declare-actions"]    [data-tour="ranking-link"]    │
│  [data-tour="performance-link"]   [data-tour="admin-checkins"]  │
│  [data-tour="admin-posts"]        [data-tour="admin-users"]    │
│  [data-tour="admin-metrics"]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1 Princípios

1. **Server decide, client executa.** Flag lido server-side, passado ao provider como `shouldStart: boolean`. Client não refaz query.
2. **Steps como dado, não JSX.** Tours são arrays de `TourStep` em arquivos `.ts`. Conteúdo separado da engine. Testável sem DOM.
3. **Sem coleta de dados novos.** Tours não pedem nada. Handles sociais continuam editáveis em `/perfil`.
4. **Rever tour = mesmo provider, flag resetado.** Não há "modo replay" — o provider recebe `shouldStart=true` de novo e dispara do zero.

## 5. Estrutura de arquivos

### 5.1 Novos arquivos

```
lib/onboarding/
  types.ts                       ← TourStep, OnboardingRole
  tours.ts                       ← exports userTourSteps, adminTourSteps
  user-tour.ts                   ← 5 steps do colaborador
  admin-tour.ts                  ← 4 steps do admin
  use-onboarding.ts              ← hook client-side
  onboarding-provider.tsx        ← Context provider (client component)

app/actions/onboarding.ts        ← markOnboarded / resetOnboarded

components/onboarding/
  onboarding-host.tsx            ← renderiza driver.js dinamicamente
  tour-replay-button.tsx         ← botão "Rever tour" (com confirmação inline)

tests/onboarding/
  tours.spec.ts                  ← valida estrutura dos steps
  onboarding-provider.spec.tsx   ← comportamento do provider
  use-onboarding.spec.ts         ← contrato do hook
  actions-onboarding.spec.ts     ← server actions (mark/reset + RLS)
```

### 5.2 Arquivos modificados

```
app/(app)/layout.tsx              ← envolve children com <OnboardingProvider role="user">
app/(admin)/admin/layout.tsx      ← envolve children com <OnboardingProvider role="admin">
app/(app)/meu-desempenho/page.tsx ← adiciona <TourReplayButton role="user">
app/(admin)/admin/page.tsx        ← adiciona <TourReplayButton role="admin">

components/timeline/*             ← adiciona data-tour attributes
components/admin-nav/*            ← adiciona data-tour attributes
components/layout/header.tsx      ← adiciona data-tour nos links (ranking, performance)
```

## 6. Contratos

### 6.1 `TourStep` (em `lib/onboarding/types.ts`)

```ts
export type OnboardingRole = 'user' | 'admin';

export interface TourStep {
  /** Seletor CSS único dentro do DOM do layout correspondente. */
  selector: string;
  /** Título do popover (1 linha, máx 60 chars). */
  title: string;
  /** Corpo do popover (2-3 linhas, máx 240 chars). */
  body: string;
  /** Posição preferida do popover relativo ao alvo. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Se true, popover fica centralizado (sem âncora a um seletor). */
  centered?: boolean;
}
```

### 6.2 Server actions (`app/actions/onboarding.ts`)

```ts
'use server';

type Role = 'user' | 'admin';

/** Marca o tour correspondente como concluído/ pulado para o usuário atual. */
export async function markOnboarded(role: Role): Promise<{ ok: true } | { ok: false; error: string }>;

/** Reseta o flag (para "Rever tour"). Apenas zera o flag, não mexe em outras colunas. */
export async function resetOnboarded(role: Role): Promise<{ ok: true } | { ok: false; error: string }>;
```

**Validações server-side:**
- `auth.uid()` obrigatório (senão retorna `{ok: false, error: 'unauthenticated'}`).
- Para `markOnboarded('admin')`: checa que `profile.is_admin === true` lendo o próprio `profiles` antes do update. Se não for admin, retorna `{ok: false, error: 'forbidden'}`.
- `resetOnboarded` aceita qualquer role (rever tour user é sempre permitido; admin é self-service).
- Update via Supabase server client com filter `id = auth.uid()`. Retorna `{ok: false}` se `affected rows = 0`.

### 6.3 Provider (`onboarding-provider.tsx`)

```tsx
'use client';

interface OnboardingProviderProps {
  role: OnboardingRole;
  shouldStart: boolean;
  children: React.ReactNode;
}
```

**API interna (via context):**
- `currentStep: number`
- `next(): void` — avança; se for o último step, chama `markOnboarded(role)`.
- `skip(): void` — chama `markOnboarded(role)` imediatamente, fecha o tour.
- `isActive: boolean` — true enquanto o tour está rolando.

### 6.4 Hook `useOnboarding()`

Retorna `{ steps, currentStep, next, skip, isActive, total }`. Lança se chamado fora de um `<OnboardingProvider>`.

## 7. Conteúdo dos tours

### 7.1 Tour do colaborador (5 passos)

| # | Seletor | Título | Corpo |
|---|---|---|---|
| 1 | `[data-tour="timeline-header"]` | Bem-vindo ao SEBRAEIERS | Engajar as redes oficiais vira disputa saudável. Em 30 segundos por dia você soma pontos e sobe no ranking. |
| 2 | `[data-tour="timeline-card"]` | O feed | Cada card é uma publicação oficial. Curta, comente ou compartilhe na rede original primeiro — depois declare aqui. |
| 3 | `[data-tour="declare-actions"]` | Declare sua ação | Toque em Curti, Comentei ou Compartilhei. Sua declaração entra na fila do admin para aprovação. |
| 4 | `[data-tour="ranking-link"]` | Ranking semanal | Dispute posição com o time. Critério de desempate: quem engajou por último fica acima. |
| 5 | `[data-tour="performance-link"]` | Seu progresso | Acompanhe pontos, histórico e status (Bronze → Diamante). Configure seus handles em Perfil quando quiser. |

### 7.2 Tour do admin (4 passos)

| # | Seletor | Título | Corpo |
|---|---|---|---|
| 1 | `[data-tour="admin-checkins"]` | Fila de aprovações | Tudo que os colaboradores declaram cai aqui. Aprove ou rejeite com nota — a nota aparece para o colaborador. |
| 2 | `[data-tour="admin-posts"]` | Publicações | Crie, edite e desative posts do feed. URL original e capa são obrigatórios; rede social é uma das 6 suportadas. |
| 3 | `[data-tour="admin-users"]` | Usuários | Busque por nome, username ou email. Ative/desative contas com cuidado — não é possível desativar o último admin. |
| 4 | `[data-tour="admin-metrics"]` | Métricas | Acompanhe aprovações pendentes, ranking agregado e uso por rede. Atualiza ao recarregar. |

### 7.3 Botões dos popovers

- `Pular tour` (esquerda, ghost) — encerra via `skip()`.
- `Próximo` / `Concluir` (direita, primary Atlântico) — `next()`. Label vira "Concluir" no último step.
- Step counter `N de M` no topo do popover.

### 7.4 Tom

Confere com `PRODUCT.md`: pt-BR idiomático, sem exclamação dupla, sem mascote, sem emoji decorativo. Premium via tipografia e espaçamento. Mobile-first (driver.js responsivo out-of-the-box, mas tema revisado em viewport < 640px).

## 8. A11y

- `role="dialog"` e `aria-modal="true"` no container do driver.js (driver.js já emite — confirmar via teste manual).
- `prefers-reduced-motion: reduce` desativa animação do driver.js via prop `animate: false`.
- Foco inicial no botão "Próximo"; foco preso no popover enquanto aberto (driver.js gerencia).
- Esc fecha o tour (comportamento padrão driver.js, equivale a pular).
- Lighthouse a11y ≥ 95 em `/timeline` e `/admin` durante o tour.

## 9. Testes

### 9.1 Unit (Vitest)

- **`tests/onboarding/tours.spec.ts`**
  - `userTourSteps` e `adminTourSteps` exportam arrays com 5 e 4 itens respectivamente.
  - Cada step tem `selector`, `title`, `body` não-vazios.
  - `title` ≤ 60 chars, `body` ≤ 240 chars.
  - Seletores são únicos dentro de cada tour (sem duplicatas).

- **`tests/onboarding/onboarding-provider.spec.tsx`**
  - `shouldStart=true` → provider monta driver.js após mount.
  - `next()` no último step chama `markOnboarded` exatamente uma vez.
  - `skip()` chama `markOnboarded` e fecha o tour.
  - `shouldStart=false` → nenhum efeito colateral, driver.js não instanciado.

- **`tests/onboarding/use-onboarding.spec.ts`**
  - Hook lança fora de provider.
  - Retorna contrato documentado (`{steps, currentStep, next, skip, isActive, total}`).

### 9.2 Integração (Supabase local + JWT)

- **`tests/actions/onboarding.spec.ts`**
  - User não-admin chama `markOnboarded('admin')` → retorna `{ok: false, error: 'forbidden'}`.
  - User admin chama `markOnboarded('admin')` → `admin_onboarded_at` setado, `onboarded_at` intacto.
  - Qualquer user chama `markOnboarded('user')` → `onboarded_at` setado.
  - `resetOnboarded('user')` zera `onboarded_at`, mantém `admin_onboarded_at`.
  - User sem auth chama qualquer action → `{ok: false, error: 'unauthenticated'}`.

### 9.3 E2E manual (procedimento em `docs/TESTING.md`)

1. Signup novo user → tour aparece na primeira visita a `/timeline`. Clicar "Pular" → flag setado. Reload → tour não aparece. `/meu-desempenho` → clicar "Rever tour" → tour reaparece, flag resetado.
2. Promover user pra admin (insert em `admin_whitelist` + UPDATE `is_admin`) → próximo login, primeira visita a `/admin` dispara tour admin. Mesmo fluxo de pular/rever.
3. Mobile (viewport 375px) → popovers não cortam, scroll do body funciona atrás do overlay.
4. `prefers-reduced-motion` ativo no SO → transições do tour ficam instantâneas.

## 10. Rollback

### 10.1 Migration down (idempotente)

```sql
alter table public.profiles drop column if exists admin_onboarded_at;
alter table public.profiles drop column if exists onboarded_at;
drop policy if exists profiles_self_onboarded_update on public.profiles;
```

### 10.2 Código

PR isolado, branch `feature/onboarding-tours`. Sem mudança em fluxos existentes além do descrito. `git revert` do merge commit desfaz tudo.

## 11. Escopo (YAGNI explícito)

**Dentro:**
- 2 tours (user + admin), driver.js, 2 flags SQL, 2 server actions, 2 botões "Rever tour".
- `data-tour` attributes em componentes existentes (timeline, declare actions, header links, admin nav).
- Tema do driver.js casando com `tokens.css`.

**Fora (próximas iterações):**
- Tour por rede social específica.
- Tour de "novo recurso" quando features forem lançadas.
- Tour localizado (i18n) — out of scope por `PRODUCT.md`.
- Tour com vídeo / GIF animado.
- Métricas de conclusão do tour (% que completam vs pulam).
- Coleta de qualquer dado novo no tour.
- Rota dedicada de onboarding.