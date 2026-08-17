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

  const isCurrent = (href: string) => !href.startsWith('/#') && pathname === href;

  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    return () => document.body.classList.remove('menu-open');
  }, [open]);

  useEffect(() => {
    /* The mobile panel is scoped to max-width:900px in CSS. Resizing past that
       with the menu open used to hide the panel but leave the open state set,
       so coming back under 900px re-opened it unprompted. */
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', onChange);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { mq.removeEventListener('change', onChange); document.removeEventListener('keydown', onKey); };
  }, []);

  const links = nav.map(({ label, href }) => (
    <Link key={href} href={href} aria-current={isCurrent(href) ? 'page' : undefined} onClick={() => setOpen(false)}>
      {label}
    </Link>
  ));

  return (
    <header className="nav-wrap">
      <nav className="nav glass" aria-label="Primary" id="siteNav">
        <Link href="/" className="nav-logo" aria-label={`${site.name} home`}>
          <SkLogo size="nav" />
          <span className="nav-wordmark">{site.name}</span>
        </Link>
        <div className="nav-links">{links}</div>
        <Link href={contactHref} className="btn btn-glass nav-cta">Start a conversation</Link>
        <button
          ref={toggleRef}
          className="nav-toggle"
          id="navToggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="navMobile"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
      </nav>
      <div className="nav-mobile glass" id="navMobile">
        {links}
        <Link href={contactHref} className="btn btn-glass-primary" onClick={() => setOpen(false)}>
          Start a conversation
        </Link>
      </div>
    </header>
  );
}
