import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles({
  root: {
    background: (props) =>
      props.color === 'gold'
        ? 'linear-gradient(45deg, #353535 10%, #D7D7D7 90%)'
        : 'linear-gradient(45deg, #D2CCC4 10%, #2F4353 90%)',
    border: 0,
    borderRadius: 30,
    boxShadow: (props) =>
      props.color === 'gold'
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
  color: PropTypes.oneOf(['blue', 'gold']).isRequired,
};