import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { config } from '../config';

export default function EpicCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const statusParam = searchParams.get('status');
    const profileId = searchParams.get('profileId');
    const jobId = searchParams.get('jobId');

    const [status, setStatus] = useState<'loading' | 'syncing' | 'success' | 'error'>('loading');
    const [logs, setLogs] = useState<string[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (statusParam !== 'connected' || !jobId) return;
        if (eventSourceRef.current) return;

        if (statusParam === 'connected' && jobId) {

            const sseUrl = `${config.endpoints.ehr}/sse/${encodeURIComponent(jobId)}`;
            console.log('SSE URL:', sseUrl);

            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                setStatus('syncing');
                setLogs(prev => [...prev, 'Connected to server...']);
            };

            es.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    // parsed = { event: 'connected' | 'fetching' | 'fetched' | 'complete' | 'failed', resource: string }

                    if (parsed.event === 'complete') {
                        setLogs(prev => [...prev, "Sync complete! Redirecting..."]);
                        es.close();
                        setTimeout(() => {
                            navigate(`/dashboard?connectedProfileId=${profileId}`);
                        }, 1000);
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
                es.close();
                eventSourceRef.current = null;
            };
            return () => {
                // ❗ Only close if component truly unmounts
                es.close();
                eventSourceRef.current = null;
            };
        } else if (statusParam === 'connected' && profileId) {
            // Fallback for cases without jobId (legacy or direct redirect)
            setStatus('success');
            setTimeout(() => {
                navigate(`/dashboard?connectedProfileId=${profileId}`);
            }, 2000);
            return
        } else {
            setStatus('error');
        }


    }, [statusParam, profileId, jobId, navigate]);

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
