import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { withFirebase } from '../Firebase';
import * as ROLES from "./roles";

const Redirect = ({ firebase }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const waiverlocations = [
        "/dashboard", "/dashboard/signup", "/dashboard/renewal",
        "/dashboard/waiverform", "/dashboard/waiverlookup",
        "/dashboard/rentalform", "/dashboard/scanwaiver",
        "/signout", "/login", "/dashboard/freegames",
        "/dashboard/birthday"
    ];

    const staticlocations = [
        "/dashboard/waiverform", "/signout", "/login"
    ];

    useEffect(() => {
        const unsubscribe = firebase.onAuthUserListener(
            (user) => setUser(user),
            () => setUser(null)
        );

        return () => unsubscribe();
    }, [firebase]);

    useEffect(() => {
        if (user && user.roles[ROLES.WAIVER]) {
            if (user.roles[ROLES.STATIC] && !staticlocations.includes(location.pathname)) {
                navigate("/dashboard/waiverform");
            } else if (!waiverlocations.includes(location.pathname)) {
                navigate("/dashboard");
            }
        }
    }, [user, location.pathname, navigate]);

    return null;
};

export default withFirebase(Redirect);