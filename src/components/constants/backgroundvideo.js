import React, { useEffect, useRef } from 'react';
import droneVideo from '../../assets/drone_video.mp4';
import fieldPoster from '../../assets/field-showcase-poster.webp';

const BackgroundVideo = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    if (!motion?.matches && !navigator.connection?.saveData) video.play()?.catch(() => {});

    const onMotionChange = (event) => {
      if (event.matches) video.pause();
    };

    if (motion?.addEventListener) {
      motion.addEventListener('change', onMotionChange);
      return () => motion.removeEventListener('change', onMotionChange);
    }

    motion?.addListener?.(onMotionChange);
    return () => motion?.removeListener?.(onMotionChange);
  }, []);

  return (
    <figure className="field-home__showcase">
      <video
        ref={videoRef}
        className="field-home__video"
        aria-label="Aerial footage of US Airsoft Field"
        poster={fieldPoster}
        src={droneVideo}
        preload="none"
        muted
        playsInline
        loop
      />
    </figure>
  );
};

export default BackgroundVideo;
