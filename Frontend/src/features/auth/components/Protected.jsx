import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) {
        return (
            <main>
                <h1 style={{ color: "#5a6080", fontFamily: "sans-serif" }}>Loading...</h1>
            </main>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default Protected;
