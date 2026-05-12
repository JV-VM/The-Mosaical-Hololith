import Link from 'next/link';

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: '/', label: 'Public Hub' },
  { href: '/explore', label: 'Explore' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Admin' },
  { href: '/auth/login', label: 'Login' },
] as const;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="tmh-shell">
      <header className="tmh-header">
        <div className="tmh-header-inner">
          <div className="tmh-brand">
            <span className="tmh-brand-mark">The Mosaical Hololith</span>
            <span className="tmh-brand-copy">
              Frontend modulith scaffold for the Render deployment path
            </span>
          </div>

          <nav className="tmh-nav" aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="tmh-main">{children}</main>

      <footer className="tmh-footer">
        <div className="tmh-footer-inner">
          Phase 1 scaffold only. Public, dashboard, and admin surfaces remain one
          web deployable with internal route boundaries.
        </div>
      </footer>
    </div>
  );
}
