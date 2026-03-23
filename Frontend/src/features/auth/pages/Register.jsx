import React, { useState } from "react";
import "../auth.form.scss";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const Register = () => {
    const { loading, handleRegister } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const success = await handleRegister({ username, email, password });
        if (success) {
            navigate("/");
        } else {
            setError("Registration failed. Please try again.");
        }
    };

    if (loading) {
        return (
            <main>
                <h1 style={{ color: "#5a6080", fontFamily: "sans-serif" }}>Loading...</h1>
            </main>
        );
    }

    return (
        <main>
            <div className="form-container">
                <h1>Register</h1>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoComplete="new-password"
                            required
                        />
                    </div>

                    {error && (
                        <p style={{ color: "#ff4d6d", fontSize: "0.8rem", textAlign: "left", marginTop: "-4px" }}>
                            {error}
                        </p>
                    )}

                    <button type="submit" className="button primary-button">
                        Register
                    </button>

                    <p>
                        Already have an account?{" "}
                        <Link to="/login">Login</Link>
                    </p>
                </form>
            </div>
        </main>
    );
};

export default Register;
