import axios from "axios"

const api = axios.create({
    baseURL: "https://gen-ai-interview-report-generator-4.onrender.com",
    withCredentials: true
})

// ✅ Send token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function register({ username, email, password }) {
    try {
        const response = await api.post('/api/auth/register', { username, email, password })

        // ✅ Save token on register
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        return response.data
    } catch (err) {
        console.log(err)
    }
}

export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", { email, password })

        // ✅ Save token on login
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        return response.data
    } catch (err) {
        console.log(err)
    }
}

export async function logout() {
    try {
        const response = await api.get("/api/auth/logout")
        localStorage.removeItem("token") // ✅ Clear token
        return response.data
    } catch (err) {
        console.log(err)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me")
        return response.data
    } catch (err) {
        console.log(err)
    }
}