import React from 'react';
import { Navigate } from 'react-router-dom';

export default function EnterLosses() {
    return <Navigate to="/admin/scores?result=loss" replace />;
}
