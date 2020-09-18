import React from 'react';
import banner from '../../assets/banner.png';
import { Carousel } from 'react-bootstrap/';

const images = [
  {url: banner},
  {url: banner},
];

const Home = () => (
  <div className="background-static-all">
    <div className="banner">
      <Carousel>
        <Carousel.Item>
          <img src={banner} alt="Swat team at US Airsoft" className="bannerimg" />
        </Carousel.Item>
      </Carousel>
    </div>
  </div>
  );

export default Home;