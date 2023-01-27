import React from 'react';
import { makeStyles } from '@mui/styles';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';

const useStyles = makeStyles({
  root: {
    background: (props) =>
      props.color === 'black-silver'
        ? 'rgb(4, 4, 4)'
        : 'rgb(8, 37, 68)',
    border: 0,
    borderRadius: 30,
    boxShadow: (props) =>
      props.color === 'black-silver'
        ? '0 1px 1px 1px rgba(192, 192, 192, .3)'
        : '0 1px 1px 1px rgba(192, 192, 192, .3)',
    color: 'white',
    height: 48,
    padding: '0 20px',
    margin: 8,
  },
});

export default function MyButton(props) {
  const { color, ...other } = props;
  const classes = useStyles(props);
  return <Button className={classes.root} {...other} />;
}

MyButton.propTypes = {
  color: PropTypes.oneOf(['silver-black', 'black-silver']).isRequired,
};