import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    const { user, setUser, loading, setLoading } = context;

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    const handleLogin = async ({ email, password }) => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            setUser(data?.user || null);
            return true;
        } catch (err) {
            console.error("LOGIN ERROR:", err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ── REGISTER ──────────────────────────────────────────────────────────────
    const handleRegister = async ({ username, email, password }) => {
        setLoading(true);
        try {
            const data = await register({ username, email, password });
            setUser(data?.user || null);
            return true;
        } catch (err) {
            console.error("REGISTER ERROR:", err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            setUser(null);
        } catch (err) {
            console.error("LOGOUT ERROR:", err);
        } finally {
            setLoading(false);
        }
    };

    // ── RESTORE SESSION ON MOUNT ──────────────────────────────────────────────
    useEffect(() => {
        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                setUser(data?.user || null);
            } catch (err) {
                console.log("GET ME ERROR:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getAndSetUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { user, loading, handleRegister, handleLogin, handleLogout };
};
