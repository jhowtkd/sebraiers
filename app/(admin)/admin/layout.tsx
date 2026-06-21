import { requireAdmin } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { AdminNav } from '@/components/layout/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <Header />
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
    </>
  );
}