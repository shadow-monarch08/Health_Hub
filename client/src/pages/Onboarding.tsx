import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api/profile';
import { oauthApi } from '../api/oauth';

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'profile' | 'connect'>('profile');
    const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);

    // Profile Form State
    const [displayName, setDisplayName] = useState('');
    const [legalName, setLegalName] = useState(''); // Optional
    const [dob, setDob] = useState(''); // Optional YYYY-MM-DD
    const [error, setError] = useState('');

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await profileApi.create({
                displayName,
                relationship: 'self',
                legalName: legalName || undefined,
                dob: dob || undefined
            });
            // Assume res is the created profile object with ID
            if (res && res.id) {
                setCreatedProfileId(res.id);
                setStep('connect');
            } else {
                // Fallback if API response structure is different (check profile service)
                // If res is wrapped, adjust accordingly. 
                // Assuming strictly Profile object for now based on service return.
                console.error("Unexpected response", res);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleConnect = async () => {
        if (!createdProfileId) return;
        try {
            const res = await oauthApi.authorize(createdProfileId);
            if (res.url) {
                window.location.href = res.url;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to start OAuth flow");
        }
    };

    const handleSkip = () => {
        navigate('/dashboard');
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ padding: '2rem', backgroundColor: '#1e293b', borderRadius: '1rem', width: '400px' }}>
                {step === 'profile' ? (
                    <>
                        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Create Your Profile</h2>
                        <p style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                            We need a few details to set up your personal health record.
                        </p>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

                        <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Display Name *</label>
                                <input
                                    type="text" placeholder="e.g. Narendra" value={displayName} onChange={e => setDisplayName(e.target.value)}
                                    style={inputStyle} required
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Legal Name (Optional)</label>
                                <input
                                    type="text" placeholder="Full legal name" value={legalName} onChange={e => setLegalName(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Date of Birth (Optional)</label>
                                <input
                                    type="date" value={dob} onChange={e => setDob(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <button type="submit" style={buttonStyle}>Continue</button>
                        </form>
                    </>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Connect Health Data</h2>
                        <p style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                            Connect your Epic account to import your medical records effortlessly.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button onClick={handleConnect} style={{ ...buttonStyle, backgroundColor: '#3b82f6' }}>
                                Connect Epic (MyChart)
                            </button>
                            <button onClick={handleSkip} style={{ ...buttonStyle, backgroundColor: 'transparent', border: '1px solid #334155' }}>
                                Skip for now
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: 'white',
    outline: 'none',
    fontSize: '1rem',
    boxSizing: 'border-box'
};

const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem'
};
