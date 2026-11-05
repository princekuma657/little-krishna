import { useState } from 'react';
import { CinematicIntro, revealCanvas } from '../components/CinematicIntro';
import { HomeMarquee } from '../sections/home/Marquee';
import { Hero } from '../sections/home/Hero';
import { BrandStory } from '../sections/home/BrandStory';
import { OnTheTracks } from '../sections/home/OnTheTracks';
import { BeyondTheTracks } from '../sections/home/BeyondTheTracks';
import { Showcase } from '../sections/home/Showcase';
import { CollectionGallery } from '../sections/home/CollectionGallery';
import { FeaturedRelease } from '../sections/home/FeaturedRelease';
import { Community } from '../sections/home/Community';
import { Supporter } from '../sections/home/Supporter';

export function Home() {
  const [showIntro] = useState(() => {
    const done = sessionStorage.getItem('littlekrishna.intro') === 'done';
    // Intro skipped this session: hand the light canvas over immediately.
    if (done) revealCanvas();
    return !done;
  });

  const handleIntroDone = () => {
    sessionStorage.setItem('littlekrishna.intro', 'done');
  };

  return (
    <>
      {showIntro ? <CinematicIntro onDone={handleIntroDone} /> : null}
      <Hero />
      <BrandStory />
      <HomeMarquee />
      <OnTheTracks />
      <BeyondTheTracks />
      <Showcase />
      <CollectionGallery />
      <FeaturedRelease />
      <Community />
      <Supporter />
    </>
  );
}
