import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function Auth() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [step, setStep] = useState<'creds' | 'otp'>('creds');

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (step === 'creds') {
                let res;
                if (mode === 'signup') {
                    res = await authApi.signup(email, name, password);
                    // Assuming res.sessionId exists based on backend requirement
                    if (res.sessionId) {
                        setSessionId(res.sessionId);
                    }
                    setStep('otp');
                } else {
                    await authApi.login(email, password);
                    // Login success -> Token set in api/auth.ts -> Redirect
                    const me = await authApi.me();
                    if (me.onboardingCompleted) {
                        navigate('/dashboard');
                    } else {
                        navigate('/onboarding');
                    }
                }
            } else {
                await authApi.verifyOtp(email, otp, sessionId);

                const me = await authApi.me();
                if (me.onboardingCompleted) {
                    navigate('/dashboard');
                } else {
                    navigate('/onboarding');
                }
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ padding: '2rem', backgroundColor: '#1e293b', borderRadius: '1rem', width: '300px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {step === 'otp' ? 'Enter OTP' : (mode === 'signup' ? 'Sign Up' : 'Log In')}
                </h2>

                {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {step === 'creds' ? (
                        <>
                            {mode === 'signup' && (
                                <input
                                    type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)}
                                    style={inputStyle} required
                                />
                            )}
                            <input
                                type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                                style={inputStyle} required
                            />
                            <input
                                type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                                style={inputStyle} required
                            />
                        </>
                    ) : (
                        <input
                            type="text" placeholder="OTP Code" value={otp} onChange={e => setOtp(e.target.value)}
                            style={inputStyle} required
                        />
                    )}

                    <button type="submit" style={buttonStyle}>
                        {step === 'otp' ? 'Verify' : (mode === 'signup' ? 'Create Account' : 'Log In')}
                    </button>
                </form>

                {step === 'creds' && (
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                        {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                        <span
                            style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                        >
                            {mode === 'signup' ? 'Log In' : 'Sign Up'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: 'white',
    outline: 'none',
    fontSize: '1rem'
};

const buttonStyle: React.CSSProperties = {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem'
};
