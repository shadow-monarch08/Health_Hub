import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { config } from '../config';

export default function EpicCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const statusParam = searchParams.get('status');
    const profileId = searchParams.get('profileId');
    const jobStatus = searchParams.get('jobStatus');
    const jobId = searchParams.get('jobId');
    const retryAfter = searchParams.get('retryAfterSeconds');

    const [status, setStatus] = useState<'loading' | 'syncing' | 'success' | 'error'>('loading');
    const [logs, setLogs] = useState<string[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (eventSourceRef.current) return;

        // 1. Handle Active Sync (with Job ID)
        if (statusParam === 'connected' && jobId) {

            const sseUrl = `${config.endpoints.ehr}/sse/${encodeURIComponent(jobId)}`;

            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                setStatus('syncing');
                setLogs(prev => [...prev, 'Connected to server...']);
            };

            es.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);

                    if (parsed.event === 'complete') {
                        setLogs(prev => [...prev, "Sync complete! Redirecting..."]);
                        cleanup();
                        setTimeout(() => navigateDashboard(), 1000);
                    } else if (parsed.event === 'failed') {
                        setLogs(prev => [...prev, `❌ Failed: ${parsed.resource || 'Unknown error'}`]);
                    } else if (parsed.event === 'connected') {
                        setLogs(prev => [...prev, "Sync started..."]);
                    } else {
                        setLogs(prev => [...prev, `✅ ${parsed.event} ${parsed.resource || ''}`]);
                    }
                } catch (e) {
                    console.error("Error parsing SSE data", e);
                }
            };

            es.onerror = () => {
                console.error("SSE connection error");
                cleanup();
                // Fallback redirect on error
                setTimeout(() => navigateDashboard(), 2000);
            };

            return () => {
                cleanup();
            };

        }
        // 2. Handle Cooldown
        else if (statusParam === 'connected' && jobStatus === 'cooldown') {
            setStatus('success'); // Or a specific 'info' status if UI supported it
            setLogs([`Sync recently completed. Cooldown active for ${retryAfter || 'some'}s.`, `Redirecting...`]);
            setTimeout(() => navigateDashboard(), 3000);
        }
        // 3. Fallback / Legacy (connected but no job info)
        else if (statusParam === 'connected' && profileId) {
            setStatus('success');
            setTimeout(() => navigateDashboard(), 2000);
        }
        // 4. Error State
        else if (statusParam) {
            setStatus('error');
        }

    }, [statusParam, profileId, jobId, jobStatus, navigate]);

    const cleanup = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    const navigateDashboard = () => {
        navigate(`/dashboard?connectedProfileId=${profileId}`);
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif'
    };

    const logBoxStyle: React.CSSProperties = {
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#1e293b',
        borderRadius: '0.5rem',
        width: '80%',
        maxWidth: '600px',
        height: '300px',
        overflowY: 'auto',
        border: '1px solid #334155',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: '#e2e8f0'
    };

    return (
        <div style={containerStyle}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: status === 'error' ? '#ef4444' : '#10b981' }}>
                {status === 'loading' && 'Verifying Connection...'}
                {status === 'syncing' && 'Syncing Health Data...'}
                {status === 'success' && 'Connected Successfully!'}
                {status === 'error' && 'Connection Failed.'}
            </h1>

            {status === 'syncing' && (
                <div style={logBoxStyle}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '0.5rem' }}>{log}</div>
                    ))}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
            )}

            <p style={{ color: '#94a3b8', marginTop: '1rem' }}>
                {status === 'success' && 'Redirecting to dashboard...'}
                {status === 'error' && 'Please close this window and try again.'}
            </p>
        </div>
    );
}
