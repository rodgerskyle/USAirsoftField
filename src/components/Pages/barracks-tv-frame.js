// TV browsers report different CSS viewport sizes for the same physical screen.
export function fitBarracksScreen(root) {
  const board = root.querySelector('.tv-frame-board');
  const content = root.querySelector('.tv-frame-content');
  const map = root.querySelector('.round-brief-tv-map');
  const measure = () => {
    if (board.clientHeight && content.offsetHeight) {
      const scale = Math.min(1, board.clientHeight / content.offsetHeight,
        board.clientWidth / Math.max(content.offsetWidth, content.scrollWidth));
      content.style.setProperty('--tv-board-scale', String(scale));
    }
    if (map?.clientHeight && map.clientWidth) {
      // The staff map and its zoomed viewBox share a 16:9 coordinate system.
      const width = Math.min(map.clientWidth, map.clientHeight * 16 / 9);
      map.style.setProperty('--tv-map-width', width + 'px');
    }
  };

  // Font, image, poll and connection changes can all resize a live TV independently.
  let observer;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure);
    for (const element of [board, content, map]) if (element) observer.observe(element);
  } else {
    observer = new MutationObserver(measure);
    observer.observe(root, {subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['class', 'hidden', 'data-briefing']});
  }
  window.addEventListener('resize', measure);
  root.addEventListener('load', measure, true);
  measure();
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', measure);
    root.removeEventListener('load', measure, true);
  };
}
