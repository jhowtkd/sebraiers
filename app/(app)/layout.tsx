import { requireUser } from '@/lib/auth';
import { Header } from '@/components/layout/header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </>
  );
}