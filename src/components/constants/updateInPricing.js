
import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import MUIButton from '@material-ui/core/Button';
import { Link } from 'react-router-dom';

function getModalStyle() {
    const top = 50;
    const left = 50;

    return {
        top: `${top}%`,
        left: `${left}%`,
        transform: `translate(-${top}%, -${left}%)`,
    };
}

const useStyles = makeStyles((theme) => ({
    paper: {
        position: 'absolute',
        width: 400,
        backgroundColor: '#141414',
        border: '2px solid #000',
        boxShadow: theme.shadows[5],
        zIndex: 1,
    },
}));

export default function Popup() {
    const classes = useStyles();
    const [modalStyle] = React.useState(getModalStyle);
    const [visible, setVisible] = React.useState(true);
    // useEffect(() => {
    //     let pop_status = localStorage.getItem('pop_status');
    //     if (!pop_status) {
    //         setVisible(true);
    //         localStorage.setItem('pop_status', 1);
    //     }
    // }, [])
    if(!visible) return null;

    return (
        <div style={modalStyle} className={classes.paper}>
            <h2 className="pricing-update-title-h2">ATTENTION: ALL PATRIOTS!</h2>
            <div className="pricing-update-inner-div">
                <p>
                    Us here at US Airsoft have fought hard and absorbed significant cost increases for as long as we could.
                </p>
                <p>
                    Despite encouraging relief signals in certain sectors, costs continue to increase.
                </p>
                <p>
                    Effective March 14th, US Airsoft will be raising prices for admission, rental guns and parties. 
                    We will also be unveiling a new deal for first time players!
                    To review our revised pricing guide, visit <Link to="/pricing" target="_blank">here</Link> on March 14th.
                </p>
                <p>
                    As always, you can rely on US Airsoft to provide you with the best airsoft experience.
                    We value your business and look forward to serving you in the future.
                </p>
                <p>
                    Sincerely,
                    US Airsoft
                </p>
            </div>
            <div className="justify-content-flex-end-div">
                <MUIButton className="pricing-update-close-button" onClick={() => setVisible(false)}>Close</MUIButton>
            </div>
        </div>
    )
}