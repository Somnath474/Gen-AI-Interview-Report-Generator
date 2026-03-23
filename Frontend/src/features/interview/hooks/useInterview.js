    const [loading, setLoading] = useState(false);
import { useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const useInterview = () => {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [report, setReport]   = useState(null);
    const [error, setError]     = useState(null);

    // ── Generate a new report ─────────────────────────────────────────────────
    const generateReport = useCallback(async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("jobDescription", jobDescription);
            if (resumeFile)       formData.append("resume", resumeFile);
            if (selfDescription)  formData.append("selfDescription", selfDescription);

            const res = await fetch(`${API_BASE}/interview/generate`, {
                method: "POST",
                headers: authHeaders(),
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Request failed (${res.status})`);
            }

            const data = await res.json();
            setReports((prev) => [data, ...prev]);
            return data;
        } catch (err) {
            setError(err.message);
            console.error("[useInterview] generateReport:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Get all reports ───────────────────────────────────────────────────────
    const getReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/interview`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const data = await res.json();
            setReports(data);
            return data;
        } catch (err) {
            setError(err.message);
            console.error("[useInterview] getReports:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Get single report by ID ───────────────────────────────────────────────
    const getReportById = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/interview/${id}`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const data = await res.json();
            setReport(data);
            return data;
        } catch (err) {
            setError(err.message);
            console.error("[useInterview] getReportById:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Download resume PDF ───────────────────────────────────────────────────
    const getResumePdf = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/interview/${id}/resume`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `resume-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
            console.error("[useInterview] getResumePdf:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, reports, report, generateReport, getReports, getReportById, getResumePdf };
};
