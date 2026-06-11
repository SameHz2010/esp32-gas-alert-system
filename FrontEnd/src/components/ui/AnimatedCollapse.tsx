"use client";

import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCollapseProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  durationMs?: number;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const AnimatedCollapse = memo(function AnimatedCollapse({
  open,
  children,
  className,
  contentClassName,
  durationMs = 320,
}: AnimatedCollapseProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const openRef = useRef(open);
  const skipInitialAnimation = useRef(open);
  const [showContent, setShowContent] = useState(open);

  openRef.current = open;

  useEffect(() => {
    if (open) setShowContent(true);
  }, [open]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;

    animationRef.current?.cancel();
    animationRef.current = null;

    if (!wrapper) return;
    if (!showContent || !content) {
      if (!open) {
        wrapper.style.height = "0px";
        wrapper.style.opacity = "0";
        wrapper.style.overflow = "hidden";
      }
      return;
    }

    const reduced = prefersReducedMotion();

    if (skipInitialAnimation.current && open) {
      skipInitialAnimation.current = false;
      wrapper.style.height = "auto";
      wrapper.style.opacity = "1";
      wrapper.style.overflow = "visible";
      return;
    }

    const targetHeight = content.scrollHeight;

    if (reduced) {
      wrapper.style.transition = "none";
      wrapper.style.height = open ? "auto" : "0px";
      wrapper.style.opacity = open ? "1" : "0";
      wrapper.style.overflow = open ? "visible" : "hidden";
      if (!open) setShowContent(false);
      return;
    }

    wrapper.style.overflow = "hidden";

    if (open) {
      wrapper.style.height = "0px";
      wrapper.style.opacity = "0";

      const animation = wrapper.animate(
        [
          { height: "0px", opacity: 0 },
          { height: `${targetHeight}px`, opacity: 1 },
        ],
        { duration: durationMs, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
      );

      animationRef.current = animation;

      animation.finished
        .then(() => {
          if (!openRef.current || !wrapperRef.current) return;
          const el = wrapperRef.current;
          el.style.height = "auto";
          el.style.opacity = "1";
          el.style.overflow = "visible";
          animation.cancel();
        })
        .catch(() => {});

      return;
    }

    const currentHeight =
      wrapper.getBoundingClientRect().height || content.scrollHeight;

    wrapper.style.height = `${currentHeight}px`;
    wrapper.style.opacity = "1";

    const animation = wrapper.animate(
      [
        { height: `${currentHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      { duration: durationMs, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    );

    animationRef.current = animation;

    animation.finished
      .then(() => {
        if (openRef.current || !wrapperRef.current) return;
        const el = wrapperRef.current;
        el.style.height = "0px";
        el.style.opacity = "0";
        el.style.overflow = "hidden";
        animation.cancel();
        setShowContent(false);
      })
      .catch(() => {});
  }, [open, showContent, durationMs]);

  useEffect(() => {
    return () => {
      animationRef.current?.cancel();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={cn("overflow-hidden", className)}>
      {showContent && (
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );
});
