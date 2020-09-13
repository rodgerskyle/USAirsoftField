import React from 'react';
import banner from '../../assets/airsoftbanner.jpg';
 

const Home = () => (
  <div className="background-static-all">
    <div className="banner">
      <img src={banner} alt="Swat team at US Airsoft" className="bannerimg" />
      <div className="overlay"></div>
      <div className="overlayText">
        The premier airsoft arena in the United States, Home of the first Stat Tracking & Leaderboard system!
              </div>
    </div>
  </div>
  );

export default Home;