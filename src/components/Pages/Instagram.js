import React, { Component } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import '../../App.css';
import iglogo from '../../assets/SocialMedia/instagram.png';

class Instagram extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            loading: true,
        };
        this.slimUpPosts = this.slimUpPosts.bind(this)
        this.getPosts = this.getPosts.bind(this)
        this.useInstagram = this.useInstagram.bind(this)
    }

    async componentDidMount() {
        let data = await this.useInstagram();
        this.setState({data}, () => {
            this.setState({loading: false})
        })
    }

    slimUpPosts(response) {
        return response.data.user.edge_owner_to_timeline_media.edges.map(edge => ({
          thumbnail: edge.node.thumbnail_src,
          url: `https://instagram.com/p/${edge.node.shortcode}`,
          caption: edge.node.edge_media_to_caption.edges[0].node.text,
          id: edge.node.id,
        }))
      }
      
      async getPosts(url) { const data = await fetch(url).then(res => res.json())
        return this.slimUpPosts(data)
      }

    useInstagram() {
        let url = 'https://www.instagram.com/graphql/query/?query_hash=42323d64886122307be10013ad2dcc44&variables={"id":"720802989","first":12}';
        return this.getPosts(url).then((posts) => {
          return (posts)
        })
    }


    render() {
        const { data } = this.state
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Instagram Photos</title>
                </Helmet>
                <h2 className="page-header"> 
                    <a href="https://www.instagram.com/usairsoftworld/" target="_blank" rel="noopener noreferrer" className="a-instagram-link">
                    <img src={iglogo} alt="Instagram Logo" className="instagram-logo"/>Instagram Media</a>
                </h2>
                <Container className="container-instagram">
                    <Row>
                        {data.length !== 0 ? data.map(photo => (
                            <Col md={4} key={photo.id} className="col-photo-instagram">
                                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                    <img src={photo.thumbnail} alt={photo.caption} className="img-instagram"></img>
                                </a>
                                <Row className="row-instagram">
                                    <p className="no-margin-bottom p-caption-instagram">{photo.caption}</p>
                                </Row>
                            </Col>
                        )): null}
                    </Row>
                </Container>
            </div>
        );
    }
}


export default Instagram;