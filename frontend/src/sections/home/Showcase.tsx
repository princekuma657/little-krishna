import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Camera, ArrowUpRight } from 'lucide-react';
import wap4Platform from '../../assets/showcase/wap4-platform.jpg';
import wap7Dusk from '../../assets/showcase/wap7-dusk.jpg';
import expressCorridor from '../../assets/showcase/express-green-corridor.jpg';
import wap7Station from '../../assets/showcase/wap7-station.jpg';
import wdg4Sabarmati from '../../assets/showcase/wdg4-sabarmati.jpg';
import icfFront from '../../assets/showcase/icf-memu-front.jpg';
import freightCountryside from '../../assets/showcase/freight-countryside.jpg';
import homePhoto8 from '../../assets/home/home-photo-8.jpeg';
import homePhoto10 from '../../assets/home/home-photo-10.jpeg';
import homePhoto11 from '../../assets/home/home-photo-11.jpeg';
import homePhoto12 from '../../assets/home/home-photo-12.jpeg';

const SHOTS = [
  {
    src: wap4Platform,
    cls: 'shot--a',
    label: 'Loco 30613 · WAP-4',
    caption: 'Red-striped electric waiting at the platform edge, monsoon sky overhead.',
  },
  {
    src: wap7Dusk,
    cls: 'shot--b',
    label: 'WAP-7 · Golden Hour',
    caption: 'Dusk departure on the suburban main line.',
  },
  {
    src: wdg4Sabarmati,
    cls: 'shot--c',
    label: 'WDG-4 12681 · Sabarmati Vijay',
    caption: 'EMD diesel power, station stop complete.',
  },
  {
    src: expressCorridor,
    cls: 'shot--d',
    label: 'Express · Green Corridor',
    caption: 'A full rake threading the wetlands.',
  },
  {
    src: freightCountryside,
    cls: 'shot--e',
    label: 'Freight · Countryside Loop',
    caption: 'Boxn rake rolling past the level crossing.',
  },
  {
    src: icfFront,
    cls: 'shot--f',
    label: 'ICF · EMU Front',
    caption: 'The familiar face of city rail.',
  },
  {
    src: wap7Station,
    cls: 'shot--g',
    label: 'WAP-7 · Under The Canopy',
    caption: 'All lines clear, arrival on schedule.',
  },
  {
    src: homePhoto8,
    cls: 'shot--h',
    label: 'Field Capture · 01',
    caption: 'A new frame from the workshop archives.',
  },
  {
    src: homePhoto10,
    cls: 'shot--i',
    label: 'Field Capture · 02',
    caption: 'Lines, light and steel.',
  },
  {
    src: homePhoto11,
    cls: 'shot--j',
    label: 'Field Capture · 03',
    caption: 'Motion frozen mid-route.',
  },
  {
    src: homePhoto12,
    cls: 'shot--k',
    label: 'Field Capture · 04',
    caption: 'The platform after departure.',
  },
];

export function Showcase() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        '.shot',
        { y: 56, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.09,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.shot-grid', start: 'top 86%' },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <Camera size={13} strokeWidth={2.4} /> From The Archive
          </span>
          <h2 className="section-title">Captured On The Network.</h2>
          <p className="section-sub">
            Direct captures from our simulation sessions — electric and diesel classics, station canopies and
            green corridors, straight out of the LittleKrishna archive.
          </p>
        </div>
        <div className="shot-grid">
          {SHOTS.map((shot) => (
            <Link to="/gallery" className={`shot ${shot.cls}`} key={shot.label} aria-label={shot.caption}>
              <img src={shot.src} alt={shot.caption} loading="lazy" />
              <span className="shot__caption">
                <span className="shot__label">{shot.label}</span>
                <span className="shot__name">{shot.caption}</span>
              </span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <Link className="btn btn--outline" to="/gallery">
            Open The Full Gallery <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
