import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function EpicCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const statusParam = searchParams.get('status');
    const profileId = searchParams.get('profileId');
    // const sessionId = searchParams.get('sessionId'); // Legacy

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        if (statusParam === 'connected' && profileId) {
            setStatus('success');
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate(`/dashboard?connectedProfileId=${profileId}`);
            }, 2000);
        } else {
            setStatus('error');
        }
    }, [statusParam, profileId, navigate]);

    const containerStyle: React.CSSProperties = {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif'
    };

    return (
        <div style={containerStyle}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: status === 'error' ? '#ef4444' : '#10b981' }}>
                {status === 'loading' && 'Verifying Connection...'}
                {status === 'success' && 'Connected Successfully!'}
                {status === 'error' && 'Connection Failed.'}
            </h1>
            <p style={{ color: '#94a3b8' }}>
                {status === 'success' && 'Redirecting to dashboard...'}
                {status === 'error' && 'Please close this window and try again.'}
            </p>
        </div>
    );
}
