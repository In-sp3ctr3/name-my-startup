import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./legal-page.module.css";

export const supportEmail = "support@spectrallabshq.com";
export const lastUpdated = "June 1, 2026";

export function LegalHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Namelift home">
        <span className={styles.brandMark} aria-hidden="true">
          <ArrowUpRight size={22} strokeWidth={3.2} absoluteStrokeWidth />
        </span>
        <span>Namelift</span>
      </Link>
      <nav className={styles.nav} aria-label="Policy navigation">
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refund-policy">Refunds</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </header>
  );
}

export function LegalFooter() {
  return (
    <footer className={styles.footer}>
      <span>© 2026 Namelift. Operated by SpectraLabsHQ.</span>
      <span className={styles.footerLinks}>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refund-policy">Refund policy</Link>
        <Link href="/contact">Contact</Link>
      </span>
    </footer>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  children
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <LegalHeader />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className={styles.meta}>
            <span>Last updated {lastUpdated}</span>
            <span>Support: {supportEmail}</span>
          </div>
        </section>
        <div className={styles.grid}>{children}</div>
      </div>
      <LegalFooter />
    </main>
  );
}

export function PolicyCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.buttonRow}>{children}</div>;
}

export const legalStyles = styles;
