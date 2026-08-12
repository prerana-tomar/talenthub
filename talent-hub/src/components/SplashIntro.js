import { useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import './SplashIntro.css';

function SplashIntro({ logoNodesRef, onFinish }) {
  const [phase, setPhase] = useState('center');
  const [style, setStyle] = useState({});

  useEffect(() => {
    const holdTimer = setTimeout(() => {
      const tryMove = () => {
        const nodes = logoNodesRef.current;
        const visibleNode = nodes.find(n => n.offsetWidth > 0 && n.offsetHeight > 0);
        if (visibleNode) {
          const rect = visibleNode.getBoundingClientRect();
          setStyle({
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          setPhase('moving');
        } else {
          setTimeout(tryMove, 100);
        }
      };
      tryMove();
    }, 1200);

    const finishTimer = setTimeout(() => onFinish(), 2300);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
    };
  }, [logoNodesRef, onFinish]);

  return (
    <div className={`splash-overlay ${phase === 'moving' ? 'fade-bg' : ''}`}>
      <img
        src={logo}
        alt="Talent Hub"
        className={`splash-logo ${phase}`}
        style={phase === 'moving' ? style : {}}
      />
    </div>
  );
}

export default SplashIntro;