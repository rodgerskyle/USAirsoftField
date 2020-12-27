import axios from 'axios';
const KEY = 'AIzaSyCTweSKU_wlv5dIYnorlj42itDW_t_EYmY';

export default axios.create({
    baseURL: 'https://www.googleapis.com/youtube/v3/',
    params: {
        part: 'snippet',
        maxResults: 10,
        key: KEY
    }
})