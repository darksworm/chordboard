import { ref, type Ref } from 'vue';

export function useBoardPanning(gridRef: Ref<HTMLElement | null>) {
  const isPanning = ref(false);
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;
  let originalCursor = '';

  const handleMouseDown = (e: MouseEvent) => {
    // Middle mouse button (button 1)
    if (e.button === 1 && gridRef.value) {
      e.preventDefault();
      isPanning.value = true;

      // Save the starting position
      startX = e.pageX;
      startY = e.pageY;
      scrollLeft = gridRef.value.scrollLeft;
      scrollTop = gridRef.value.scrollTop;

      // Save original cursor and change to panning cursor
      originalCursor = gridRef.value.style.cursor;
      gridRef.value.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning.value || !gridRef.value) return;

    e.preventDefault();

    // Calculate how far the mouse has moved
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    // Scroll the grid in the opposite direction
    gridRef.value.scrollLeft = scrollLeft - dx;
    gridRef.value.scrollTop = scrollTop - dy;
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1 && isPanning.value && gridRef.value) {
      isPanning.value = false;
      gridRef.value.style.cursor = originalCursor;
    }
  };

  const handleMouseLeave = () => {
    if (isPanning.value && gridRef.value) {
      isPanning.value = false;
      gridRef.value.style.cursor = originalCursor;
    }
  };

  const setupPanning = () => {
    if (!gridRef.value) return;

    gridRef.value.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
  };

  const cleanupPanning = () => {
    if (!gridRef.value) return;

    gridRef.value.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mouseleave', handleMouseLeave);
  };

  return {
    setupPanning,
    cleanupPanning,
    isPanning
  };
}
