import React, { Component } from 'react';
import '../../App.css';
import {encode, decode } from 'firebase-encode';

class Pictures extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    componentDidMount() {
        var x = "jimmy@gmail.com"
        console.log(x)
        x = encode(x);
        console.log(x)
        console.log(decode(x))
    }


    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Pictures</h2>
            </div>
        );
    }
}


export default Pictures;