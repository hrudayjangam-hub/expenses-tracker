import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * Subtle scroll-linked parallax for decorative layers.
 * `distance` is the total travel in px across the element's viewport pass.
 * Never wrap readable text — use on background/decorative elements only.
 */
export default function Parallax({ children, distance = 40, className = '', start = 'start end', end = 'end start' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: [start, end] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div style={reduce ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}
