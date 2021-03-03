import React, { Component } from 'react';
import '../../App.css';
import { Container, Row, Col, Spinner } from 'react-bootstrap';

import ytlogo from '../../assets/SocialMedia/youtube.png';

import { withFirebase } from '../Firebase';

import { compose } from 'recompose';

import { Helmet } from 'react-helmet-async';

class Videos extends Component {
    constructor(props) {
        super(props);

        this.state = {
            videos: [],
            selectedVideo: null,
            selectedIndex: 0,
        };

        this.handleVideoSelect = this.handleVideoSelect.bind(this)
    }

    componentDidMount() {
        this.props.firebase.videos().on('value', snapshot => {
            const videosObject = snapshot.val();

            this.setState({videos: videosObject, selectedVideo: videosObject[0]})
        })
    }

    componentWillUnmount() {
        this.props.firebase.videos().off()
    }

    handleVideoSelect = (video, index) => {
        this.setState({selectedVideo: video, selectedIndex: index})
    }

    render() {
        const { selectedVideo, videos } = this.state
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Youtube Videos</title>
                </Helmet>
                <h2 className="page-header"> 
                <a href="https://www.youtube.com/user/USAirsoftWorldInc" target="_blank" rel="noopener noreferrer" className="a-youtube-link">
                <img src={ytlogo} alt="Instagram Logo" className="youtube-logo"/>Youtube Videos</a>
                </h2>
                <Container className="container-youtube">
                    <Row>
                        <Col md={8}>
                            <VideoDetail video={selectedVideo}/>
                        </Col>
                        <Col md={4} className="col-videolist-youtube">
                            <h4>Newest Videos:</h4>
                            <VideoList videos={videos} handleVideoSelect={this.handleVideoSelect} 
                            selected={this.state.selectedIndex}/>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

// List of the videos
const VideoList = ({videos , handleVideoSelect, selected}) => {
    const renderedVideos =  videos.map((video, i) => {
        return <VideoItem key={video.id} video={video} handleVideoSelect={handleVideoSelect} index={i} selected={selected}/>
    });

    return <div>{renderedVideos}</div>;
}

// Description of the video
const VideoItem = ({video, handleVideoSelect, index, selected}) => {
    return (
        <div onClick={ () => {
            handleVideoSelect(video, index);
        }} className="div-video-item-youtube">
            {video !== null ?
            <div>
                <img src={video.thumbnail} alt={video.desc} 
                className={ selected === index ? "img-selected-video-youtube img-video-youtube" 
                : "img-video-youtube"}/>
                <div >
                    <div className="video-thumbnail-title-youtube">{video.title}</div>
                </div>
            </div>
            : null}
        </div>
    )
};

// Where the youtube video is played at
function VideoDetail({video}) {
    if (!video) {
        return <Row className="justify-content-row">
            <Spinner animation="border"/> 
        </Row>;
    }

    const videoSrc = `https://www.youtube.com/embed/${video.id}`;
    return (
        <div>
            <div className="div-iframe-youtube">
                <iframe src={videoSrc} allowFullScreen title='Video player'
                className="iframe-youtube"/>
            </div>
            <div>
                <h4 className="video-player-title-youtube">{video.title}</h4>
                <p>{video.desc}</p>
            </div>
        </div>
    )
}

export default compose(
    withFirebase,
    )(Videos);