import React, { Component, useState } from 'react';
import '../../App.css';
import { Container, Row, Col, Spinner } from 'react-bootstrap';

import ytlogo from '../../assets/SocialMedia/youtube.png';

class Videos extends Component {
    constructor(props) {
        super(props);

        this.state = {
            videos: [],
            selectedVideo: null
        };

        //this.handleSubmit = this.handleSubmit.bind(this)
        this.handleVideoSelect = this.handleVideoSelect.bind(this)
    }

    // async componentDidMount() {
    //     const response = await youtube.get("/search", {
    //         params: {
    //             q: "",
    //             channelId: 'UCrSwLQaT3U9DXzyYGoyOuGA',
    //             order: 'date',
    //         }
    //     })
    //     console.log(response)
    //     this.setState({
    //         videos: response.data.items
    //     }, () => {
    //         this.setState({selectedVideo: this.state.videos[0]})
    //     })
    // }

    // handleSubmit = async (e, termFromSearchBar) => {
    //     e.preventDefault()
    //     const response = await youtube.get('/search', {
    //         params: {
    //             q: termFromSearchBar,
    //             channelId: 'UCrSwLQaT3U9DXzyYGoyOuGA',
    //             order: 'date',
    //         }
    //     })
    //     this.setState({
    //         videos: response.data.items
    //     })
    // };

    handleVideoSelect = (video) => {
        this.setState({selectedVideo: video})
    }

    render() {
        const { selectedVideo, videos } = this.state
        return (
            <div className="background-static-all">
                <h2 className="page-header"> <img src={ytlogo} alt="Instagram Logo" className="youtube-logo"/>Youtube Videos</h2>
                <Container className="container-youtube">
                    <Row>
                        <Col md={8}>
                            <VideoDetail video={selectedVideo}/>
                        </Col>
                        <Col md={4} className="col-videolist-youtube">
                            <h4>Newest Videos:</h4>
                            <VideoList videos={videos} handleVideoSelect={this.handleVideoSelect} />
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

// List of the videos
const VideoList = ({videos , handleVideoSelect}) => {
    const renderedVideos =  videos.map((video, i) => {
        return <VideoItem key={video.id.videoId} video={video} handleVideoSelect={handleVideoSelect} index={i}/>
    });

    return <div>{renderedVideos}</div>;
}

// Description of the video
const VideoItem = ({video , handleVideoSelect, index}) => {
    const [selected, setSelected] = useState(0)
    return (
        <div onClick={ () => {
            handleVideoSelect(video);
            setSelected(index)
        }} className="div-video-item-youtube">
            {video !== null ?
            <div>
                <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.description}
                className={selected === index ? "img-selected-video-youtube": null}/>
                <div >
                    <div className="video-thumbnail-title-youtube">{video.snippet.title}</div>
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

    const videoSrc = `https://www.youtube.com/embed/${video.id.videoId}`;
    return (
        <div>
            <div className="div-iframe-youtube">
                <iframe src={videoSrc} allowFullScreen title='Video player'
                className="iframe-youtube"/>
            </div>
            <div>
                <h4 className="video-player-title-youtube">{video.snippet.title}</h4>
                <p>{video.snippet.description}</p>
            </div>
        </div>
    )
}

// // Ability to search for a youtube video
// function SearchBar({ submit }) {
//     const [searchTerm, setSearchTerm] = useState("");

//     return (
//         <Col md={8}>
//             <Form onSubmit={(e) => submit(e, searchTerm)}>
//                 <Form.Label htmlFor="video-search">Video Search</Form.Label>
//                 <Form.Control onChange={e => setSearchTerm(e.target.value)} name='video-search' type="text" value={searchTerm}/>
//             </Form>
//         </Col>
//     )
// }

export default Videos;