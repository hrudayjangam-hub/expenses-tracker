import { motion, useReducedMotion } from 'framer-motion';

export const EASE = [0.22, 1, 0.36, 1];

/**
 * Fade + rise reveal that triggers when the element enters the viewport.
 * Animates transform/opacity only; honours prefers-reduced-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 20,
  duration = 0.6,
  amount = 0.2,
  once = true,
  className = '',
  as: Tag = 'div',
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag] || motion.div;

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/** Staggered children reveal — pass an array of children; each gets a small delay. */
export function RevealGroup({ children, delay = 0, step = 0.07, y = 16, className = '', amount = 0.15 }) {
  const reduce = useReducedMotion();
  const items = Array.isArray(children) ? children : [children];

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount }}
          transition={{ duration: 0.5, delay: delay + i * step, ease: EASE }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/** Entrance used for page-level content (no viewport gate needed). */
export function FadeIn({ children, delay = 0, y = 12, className = '', duration = 0.45 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
