'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { nav, site } from '@/lib/content';
import { SkLogo } from './GlassFilter';

const contactHref = '/#contact';

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isCurrent = (href: string) => !href.startsWith('/#') && pathname === href;

  /* Lock the page while the sheet is open. Without this the homepage scrolled
     freely behind a translucent panel — content sliding around under the menu
     was the single worst thing about the mobile experience. Position-fixing the
     body (rather than overflow:hidden alone) is what actually stops iOS Safari
     from scrolling the page underneath. */
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const { body } = document;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    body.classList.add('menu-open');
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.classList.remove('menu-open');
      window.scrollTo(0, y);
    };
  }, [open]);

  useEffect(() => {
    /* The sheet is scoped to max-width:900px in CSS. Crossing that while open
       used to hide it but leave the state set, so coming back re-opened it. */
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', onChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { mq.removeEventListener('change', onChange); document.removeEventListener('keydown', onKey); };
  }, []);

  /* Move focus into the sheet so a keyboard or screen-reader user is not left
     behind on the page underneath. */
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Primary" id="siteNav">
        <Link href="/" className="nav-logo" aria-label={`${site.name} home`} onClick={close}>
          <SkLogo size="nav" />
          <span className="nav-wordmark">{site.name}</span>
        </Link>
        <div className="nav-links">
          {nav.map(({ label, href }) => (
            <Link key={href} href={href} aria-current={isCurrent(href) ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </div>
        <Link href={contactHref} className="btn btn-glass nav-cta">Start a conversation</Link>
        <button
          ref={toggleRef}
          className="nav-toggle"
          id="navToggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="navMobile"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
      </nav>

      {/* Tapping anywhere off the sheet closes it. */}
      <div className="nav-scrim" onClick={close} aria-hidden="true" />

      <div
        className="nav-mobile"
        id="navMobile"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        {...(open ? {} : { inert: '' as unknown as boolean })}
      >
        <div className="nav-mobile-links">
          {nav.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? 'page' : undefined}
              onClick={close}
            >
              {label}
              <span aria-hidden="true">&#8599;</span>
            </Link>
          ))}
        </div>
        <div className="nav-mobile-foot">
          <Link href={contactHref} className="btn btn-glass-primary" onClick={close}>
            Start a conversation
          </Link>
          <a href={`mailto:${site.mailto}`} onClick={close}>{site.emailDisplay}</a>
        </div>
      </div>
    </header>
  );
}
