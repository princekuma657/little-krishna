import { useState } from 'react';
import { CinematicIntro } from '../components/CinematicIntro';
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
  const [showIntro] = useState(() => sessionStorage.getItem('littlekrishna.intro') !== 'done');

  const handleIntroDone = () => {
    sessionStorage.setItem('littlekrishna.intro', 'done');
  };

  return (
    <>
      {showIntro ? <CinematicIntro onDone={handleIntroDone} /> : null}
      <Hero />
      <BrandStory />
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
