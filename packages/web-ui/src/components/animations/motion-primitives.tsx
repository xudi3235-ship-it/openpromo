import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// ============================================
// ANIMATION VARIANTS
// ============================================

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const blurInVariants: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)", y: 10 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

export const textStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3,
    },
  },
};

// ============================================
// ANIMATION PRIMITIVES COMPONENTS
// ============================================

interface AnimatedElementProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

// Fade In Animation
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
}: AnimatedElementProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide Up Animation
export function SlideUp({
  children,
  className,
  delay = 0,
  duration = 0.6,
}: AnimatedElementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Blur In Animation
export function BlurIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
}: AnimatedElementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger Container
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  childDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.2,
  childDelay = 0.1,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: childDelay,
          },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger Item (to be used inside StaggerContainer)
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={slideUpVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Text Animation with word-by-word reveal
interface AnimatedTextProps {
  text: string;
  className?: string;
  wordDelay?: number;
  startDelay?: number;
  children?: ReactNode;
}

export function AnimatedText({
  text,
  className,
  wordDelay = 0.08,
  startDelay = 0.3,
  children,
}: AnimatedTextProps) {
  const words = text.split(" ");

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: wordDelay,
            delayChildren: startDelay,
          },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <div className="inline">
        {words.map((word, index) => (
          <motion.span
            key={`word-${word}-${Date.now()}-${index}`}
            variants={blurInVariants}
            className="inline-block mr-3 last:mr-0"
          >
            {word}
          </motion.span>
        ))}
      </div>
      {children}
    </motion.div>
  );
}

// Scale In Animation
export function ScaleIn({
  children,
  className,
  delay = 0,
  duration = 0.6,
}: AnimatedElementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide From Direction
interface SlideFromProps extends AnimatedElementProps {
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
}

export function SlideFrom({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 20,
}: SlideFromProps) {
  const getInitialPosition = () => {
    switch (direction) {
      case "left":
        return { x: -distance, y: 0 };
      case "right":
        return { x: distance, y: 0 };
      case "down":
        return { x: 0, y: -distance };
      default:
        return { x: 0, y: distance };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
