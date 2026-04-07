import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const dur = 1200;
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          setDisplay((1 - Math.pow(1 - p, 3)) * value);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {Math.round(display).toLocaleString('fr-FR')}{suffix}
    </span>
  );
}
