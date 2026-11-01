import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { CONTENT } from '../../data/content';
import { Badge, ContentCard } from '../../components/ui';
import type { ContentItem } from '../../types';

function trackOf(item: ContentItem) {
  return item.category === 'routes' || item.category === 'trains';
}

export function OnTheTracks() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.track-card',
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.track-card', start: 'top 88%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  const items = CONTENT.filter((c) => c.status === 'published' && trackOf(c)).slice(0, 6);

  return (
    <section className="section section--alt" ref={ref}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">On The Tracks</span>
          <h2 className="section-title">Routes, Locomotives, Trains.</h2>
          <p className="section-sub">
            Indian railway simulation experiences across the subcontinent, from the Great Indian Peninsula Railway
            to the modern high-speed corridors.
          </p>
        </div>
        <div className="grid grid--3">
          {items.map((item) => (
            <div className="track-card" key={item.id}>
              <ContentCard item={item} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <Link className="btn btn--outline" to="/routes">
            Browse All Routes <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
