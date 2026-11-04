import { useRef, useEffect } from 'react';

export const useDragScroll = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // Hanya tangkap klik kiri mouse (desktop), jangan tangkap sentuhan jari
      if (e.button !== 0) return;

      // Abaikan jika user mengklik tombol aksi, link, atau input di dalam tabel
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, select, textarea')) {
        return;
      }

      isDown = true;
      startX = e.pageX - el.offsetLeft;
      startY = e.pageY;
      scrollLeft = el.scrollLeft;
      el.classList.add('cursor-grabbing');
      el.classList.remove('cursor-grab');
    };

    const handleMouseLeaveOrUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('cursor-grabbing');
      el.classList.add('cursor-grab');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;

      const deltaX = e.pageX - el.offsetLeft - startX;
      const deltaY = Math.abs(e.pageY - startY);

      // Hanya geser horizontal jika pergerakan mouse dominan menyamping (X > Y)
      if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > deltaY) {
        e.preventDefault();
        el.scrollLeft = scrollLeft - deltaX * 1.2;
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseLeaveOrUp);
    window.addEventListener('mousemove', handleMouseMove);

    // CATATAN PENTING: JANGAN tambahkan event listener 'wheel' atau 'touchmove' dengan preventDefault!
    // Biarkan scroll vertikal mouse wheel & usapan jari (touch) ditangani secara native oleh browser.

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseLeaveOrUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return ref;
};

export function useSmoothDragScroll() {
  const scrollRef = useDragScroll<HTMLDivElement>();
  return {
    scrollRef,
    dragProps: {},
    isDragging: false,
  };
}
