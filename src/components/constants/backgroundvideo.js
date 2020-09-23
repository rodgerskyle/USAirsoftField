import React from 'react'
import Drone_video from '../../assets/drone_video.mp4';
import classes from './BackgroundVideo.module.css';

const BackgroundVideo = () => {
    return (
        <div className={classes.Container}>
            <video autoPlay="autoplay" loop="loop" muted className={classes.Video} >
                <source src={Drone_video} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
      h </div>
    )
}

export default BackgroundVideo