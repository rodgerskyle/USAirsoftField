import React, { useEffect, useRef, useState } from 'react';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import droneVideo from '../../assets/drone_video.mp4';
import fieldPoster from '../../assets/field-showcase-poster.webp';

const BackgroundVideo = () => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

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

  const togglePlayback = () => {
    const video = videoRef.current;
    if (video.paused) video.play()?.catch(() => {});
    else video.pause();
  };

  return (
    <figure className="field-home__showcase">
      <video
        ref={videoRef}
        id="field-showcase-video"
        className="field-home__video"
        aria-label="US Airsoft Field showcase"
        poster={fieldPoster}
        src={droneVideo}
        preload="none"
        muted
        playsInline
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setUnavailable(true)}
      />
      <figcaption className="field-home__showcase-caption">
        <span>
          <strong>Field showcase</strong>
          {unavailable && <small>Video unavailable</small>}
        </span>
        {!unavailable && (
          <button
            className="field-home__video-toggle"
            type="button"
            aria-controls="field-showcase-video"
            aria-label={playing ? 'Pause field showcase' : 'Play field showcase'}
            onClick={togglePlayback}
          >
            <FontAwesomeIcon icon={playing ? faPause : faPlay} />
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
      </figcaption>
    </figure>
  );
};

export default BackgroundVideo;
