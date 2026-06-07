import { Suspense, lazy, useCallback, useState } from 'react';
import { Nav } from './components/Nav';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Work } from './components/sections/Work';
import { Contact } from './components/sections/Contact';
import { MotionRoot } from './components/MotionRoot';
import { Cursor } from './components/Cursor';
import { SoundToggle } from './components/SoundToggle';
import { Preloader } from './components/Preloader';
import { footerCopy } from './content/site';

// Code-split the 3D scene (three + r3f + postprocessing is most of the bundle).
const Scene = lazy(() => import('./three/Scene').then((m) => ({ default: m.Scene })));
// Second WebGL context: hosts the four project objects via drei <View>.
const ProjectsCanvas = lazy(() =>
  import('./three/ProjectsCanvas').then((m) => ({ default: m.ProjectsCanvas })),
);

export default function App() {
  const [started, setStarted] = useState(false);
  const onPreloaderDone = useCallback(() => setStarted(true), []);

  return (
    <>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <MotionRoot start={started} />
      <Suspense fallback={null}>
        <ProjectsCanvas />
      </Suspense>
      <div className="progress" id="progress" />
      <Nav />
      <div className="wrap">
        <Hero />
        <About />
        <Work />
        <Contact />
        <footer>
          <span>{footerCopy.left}</span>
          <span>{footerCopy.right}</span>
        </footer>
      </div>
      <SoundToggle />
      <Cursor />
      <Preloader onComplete={onPreloaderDone} />
    </>
  );
}
