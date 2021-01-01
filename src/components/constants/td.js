import React from 'react';
import { Link } from 'react-router-dom';

export default function Td({ children, to, cl, ct }) {
    // Conditionally wrapping content into a link
    const ContentTag = to ? Link : 'div';
  
    return (
      <td className={cl}>
        <ContentTag className={ct} to={to}>{children}</ContentTag>
      </td>
    );
  }