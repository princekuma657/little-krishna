import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { COLLECTIONS } from '../../data/content';
import { CollectionCard } from '../../components/ui';

export function CollectionGallery() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.gallery-card',
        { y: 70, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.gallery-card', start: 'top 88%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section section--alt" ref={ref}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Collection Gallery</span>
          <h2 className="section-title">The Collection.</h2>
          <p className="section-sub">
            Dedicated collections for MSTS, RailWorks and Train Simulator Classic content — each item opens its own
            story.
          </p>
        </div>
        <div className="grid grid--3">
          {COLLECTIONS.map((c) => (
            <div className="gallery-card" key={c.slug}>
              <CollectionCard collection={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
