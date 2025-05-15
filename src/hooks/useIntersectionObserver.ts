import { useEffect, RefObject } from 'react';

interface UseIntersectionObserverProps {
  target: RefObject<HTMLElement>;
  onIntersect: () => void;
  enabled?: boolean;
  root?: HTMLElement | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export const useIntersectionObserver = ({
  target,
  onIntersect,
  enabled = true,
  root = null,
  rootMargin = '0px',
  threshold = 0,
}: UseIntersectionObserverProps) => {
  useEffect(() => {
    if (!enabled || !target.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect();
          }
        });
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(target.current);

    return () => {
      if (target.current) {
        observer.unobserve(target.current);
      }
    };
  }, [target, enabled, root, rootMargin, threshold, onIntersect]);
};