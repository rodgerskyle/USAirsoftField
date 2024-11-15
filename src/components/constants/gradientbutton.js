import React from 'react';
import { styled } from '@mui/material/styles';
import MuiButton from '@mui/material/Button';
import PropTypes from 'prop-types';

// Create a base button component without MUI's default styles
const BaseButton = styled('button')({
  border: 0,
  cursor: 'pointer',
  borderRadius: '8px',
  height: 48,
  margin: '8px',
  textTransform: 'uppercase',
  fontWeight: 600,
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontSize: '0.875rem',
  letterSpacing: '1px',
  transition: 'all 0.3s ease-in-out',
});

// Style the button with our gradient styles
const StyledButton = styled(BaseButton)(({ colortype }) => ({
  background: colortype === 'black-silver'
    ? 'linear-gradient(45deg, #0A1929 30%, #1A2C43 90%)'
    : 'linear-gradient(45deg, #1A2C43 30%, #1976d2 90%)',
  boxShadow: '0 3px 5px rgba(0, 0, 0, 0.3)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.1)',

  '&:hover': {
    background: colortype === 'black-silver'
      ? 'linear-gradient(45deg, #1A2C43 30%, #0A1929 90%)'
      : 'linear-gradient(45deg, #1976d2 30%, #1A2C43 90%)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
    transform: 'translateY(-2px)',
    border: '1px solid #1976d2',
  },

  '&:active': {
    transform: 'translateY(1px)',
  },

  '&:disabled': {
    background: '#1A2C43',
    color: '#4A5568',
    boxShadow: 'none',
    cursor: 'default',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
}));

const GradientButton = ({ color, children, ...props }) => (
  <StyledButton colortype={color} {...props}>
    {children}
  </StyledButton>
);

GradientButton.propTypes = {
  color: PropTypes.oneOf(['silver-black', 'black-silver']).isRequired,
  children: PropTypes.node.isRequired,
};

export default GradientButton;