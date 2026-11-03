import { useRef, useState, MouseEvent } from 'react';

export function useSmoothDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Abaikan jika user mengklik tombol, link, atau input di dalam tabel
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select')) {
      return;
    }
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    // Faktor pengali 1.25 untuk pergeseran yang sangat mulus dan proporsional (1:1.25)
    const walk = (x - startX) * 1.25;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return {
    scrollRef,
    dragProps: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
    isDragging,
  };
}
