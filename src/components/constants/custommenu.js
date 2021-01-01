import React, { useState } from 'react';
import '../../App.css';

import { FormControl } from 'react-bootstrap/';
  
  // forwardRef again here!
  // Dropdown needs access to the DOM of the Menu to measure it
  const CustomMenu = React.forwardRef(
    ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
      const [value, setValue] = useState('');
  
      return (
        <div
          ref={ref}
          style={style}
          className={className}
          aria-labelledby={labeledBy}
        >
          <FormControl
            autoFocus
            className="my-2 w-auto"
            placeholder="Type to filter..."
            onChange={(e) => 
                setValue(e.target.value)
            }
            value={value}
          />
          <ul className="list-unstyled">
            {React.Children.toArray(children).filter(
              (child) =>
                !value || child.props.children.toString().toLowerCase().startsWith(value),
            )}
          </ul>
        </div>
      );
    },
  );

export default CustomMenu;