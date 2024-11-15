import React from 'react';
import { Paper, InputBase, Divider } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        float: 'right',
        background: '#424242',
        margin: '5px',
        width: 600,
    },
    // ... rest of your styles
}));

export const RentalRow = ({ obj, set, i }) => {
    const classes = useStyles();

    return (
        <Row>
            <Col>
                <Paper className="paper-rental-row-rf">
                    <InputBase
                        placeholder="Amount:"
                        inputProps={{ 'aria-label': 'enter amount' }}
                        type="number"
                        value={obj.amount}
                        onChange={(e) => set(i, e.target.value)}
                    />

                    <Divider orientation="vertical" />
                    <h5>{obj.label}</h5>
                </Paper>
            </Col>
        </Row>
    )
}