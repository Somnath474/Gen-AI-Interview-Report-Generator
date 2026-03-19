import React from 'react'
import { Link } from 'react-router';
import { useNavigate, } from 'react-router';

const Register = () => {
    const handleSubmit=(e)=>{
        e.preventdefault();
    }
  return (
    <main>
        <div className="form-container">
            <h1>Register</h1>
            <form onSubmit={handleSubmit} > 
                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input type="text" id="username" placeholder="Enter username"/>

                </div>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" placeholder="Enter email address"/>

                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" placeholder="Enter password"/> 
                </div>
                <button className="button primary-button">Register</button>
                <p>Already have an account ?  <Link to="/login">Login</Link></p>

            </form>
        </div>
    </main>
  )
}

export default Register
