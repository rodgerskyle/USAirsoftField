import React from 'react';
import { Navigate } from 'react-router-dom';

export default function EnterWins() {
    return <Navigate to="/admin/scores?result=win" replace />;
}
