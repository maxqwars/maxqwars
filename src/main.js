import './styles/main.css';

import { TunnelScene } from './utils/background';
import { ScrollManager } from './utils/scroll';
import { NavController } from './utils/nav';
import { GithubRepos } from './utils/github';
import { Timeline } from './utils/timeline';

document.addEventListener('DOMContentLoaded', () => {
  const scrollManager = new ScrollManager({
    wrapperSelector: '.snap-container',
    sectionSelector: '.snap-section',
    navLinkSelector: '.nav-links a',
    snapDelay: 50,
    lenisDuration: 1.2,
  });

  new NavController(scrollManager);

  const canvas = document.querySelector('#bg-canvas');
  if (canvas) {
    const tunnel = new TunnelScene(canvas);
    scrollManager.lenis.on('scroll', ({ velocity }) => {
      tunnel.params.speed = 6.0 + Math.abs(velocity) * 5;
    });
    // const tunnelToggle = document.querySelector('#tunnel-toggle');
    // if (tunnelToggle) {
    //   tunnelToggle.checked = true;

    //   tunnelToggle.addEventListener('change', () => {
    //     if (tunnelToggle.checked) {
    //       tunnel.resume();
    //     } else {
    //       tunnel.pause();
    //     }
    //   });
    // }
  }

  new GithubRepos('#github', 'maxqwars');
  new Timeline('.timeline-track', scrollManager);
});
