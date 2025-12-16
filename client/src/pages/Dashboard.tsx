import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api/profile';
import type { Profile } from '../api/profile';
import { ehrApi } from '../api/ehr';
import { oauthApi } from '../api/oauth';
import { removeAuthToken } from '../api/client';

export default function Dashboard() {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [ehrData, setEhrData] = useState<any>(null);
    const [loading, setLoading] = useState(false);



    useEffect(() => {
        loadProfiles();
    }, []);



    const loadProfiles = async () => {
        try {
            const list = await profileApi.list();
            setProfiles(list);


        } catch (error) {
            console.error(error);
            // If error is 401, client.ts handles token removal, we just need to redirect
            if (!localStorage.getItem('auth_token')) {
                navigate('/auth');
            }
        }
    };

    const handleConnect = async (profileId: string) => {
        try {
            const res = await oauthApi.authorize(profileId);
            if (res.url) {
                window.location.href = res.url;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to start OAuth flow");
        }
    };

    const handleFetchData = async (profileId: string) => {
        setLoading(true);
        setEhrData(null);
        try {
            // 1. Trigger Sync
            await ehrApi.sync(profileId);

            // 2. Fetch Clean Data
            const results = await Promise.allSettled([
                ehrApi.fetchResource(profileId, 'Patient', 'clean'),
                ehrApi.fetchResource(profileId, 'Condition', 'clean'),
                ehrApi.fetchResource(profileId, 'AllergyIntolerance', 'clean'),
                ehrApi.fetchResource(profileId, 'MedicationRequest', 'raw'),
                ehrApi.fetchResource(profileId, 'Observation', 'clean'), // Lab Results + Vitals
                ehrApi.fetchResource(profileId, 'Encounter', 'clean'),
                ehrApi.fetchResource(profileId, 'Procedure', 'clean'),
                ehrApi.fetchResource(profileId, 'Immunization', 'clean'),
            ]);

            const getData = (index: number) => {
                const result = results[index];
                return result.status === 'fulfilled' ? result.value : { error: 'Failed to fetch', details: result.reason };
            };

            setEhrData({
                patient: getData(0),
                conditions: getData(1),
                allergies: getData(2),
                medications: getData(3),
                labs: getData(4),
                encounters: getData(5),
                procedures: getData(6),
                immunizations: getData(7),
            });
        } catch (error: any) {
            console.error('Fetch error:', error);
            // Even if something catastrophic happens, try to set error state if simple
            alert('Failed to fetch data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        removeAuthToken();
        navigate('/auth');
    };

    if (loading) return <div>Loading data...</div>; // Optional simpler loading state or keep button

    // Helper to render sections
    const renderSection = (title: string, data: any) => (
        <div>
            <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{title}</h3>
            <pre style={codeBlockStyle}>{data ? JSON.stringify(data, null, 2) : 'No data loaded'}</pre>
        </div>
    );

    return (
        <div style={{
            padding: '2rem', backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif'
        }}>
            {/* ... Header (profiles) remains ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => navigate('/onboarding')} style={secondaryButtonStyle}>+ New Profile</button>
                    <button onClick={handleLogout} style={{ ...secondaryButtonStyle, backgroundColor: '#ef4444' }}>Logout</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {profiles.map(profile => {
                    const epicConnection = profile.emrConnections?.find((c: any) => c.provider === 'epic');
                    const isConnected = epicConnection?.status === 'connected';

                    return (
                        <div key={profile.id} style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>{profile.displayName}</h3>
                                    <span style={{ fontSize: '0.875rem', color: '#94a3b8', textTransform: 'capitalize' }}>{profile.relationship}</span>
                                </div>
                                <div style={{
                                    padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                                    backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                    color: isConnected ? '#34d399' : '#94a3b8'
                                }}>
                                    {isConnected ? 'Connected' : 'Not Connected'}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                                {!isConnected ? (
                                    <button
                                        onClick={() => handleConnect(profile.id)}
                                        style={primaryButtonStyle}
                                    >
                                        Connect Epic
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleFetchData(profile.id)}
                                            style={primaryButtonStyle}
                                            disabled={loading}
                                        >
                                            {loading ? 'Fetching...' : 'View Raw Data'}
                                        </button>
                                        <button
                                            onClick={() => handleConnect(profile.id)}
                                            style={{ ...secondaryButtonStyle, borderColor: '#3b82f6', color: '#3b82f6' }}
                                        >
                                            Reconnect
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {ehrData && (
                <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Patient Demographics</h2>
                    <div style={{ marginBottom: '3rem' }}>
                        {renderSection('Patient Details', ehrData.patient)}
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>Medical Data</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {renderSection('Conditions', ehrData.conditions)}
                        {renderSection('Allergies', ehrData.allergies)}
                        {renderSection('Medications', ehrData.medications)}
                        {renderSection('Lab Results (Observations)', ehrData.labs)}
                        {renderSection('Encounters', ehrData.encounters)}
                        {renderSection('Procedures', ehrData.procedures)}
                        {renderSection('Immunizations', ehrData.immunizations)}
                    </div>
                </div>
            )}
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    backgroundColor: '#1e293b',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #334155'
};

const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
};

const secondaryButtonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer'
};

const codeBlockStyle: React.CSSProperties = {
    backgroundColor: '#020617', // Darker background
    padding: '1.5rem',
    borderRadius: '0.75rem',
    overflowX: 'auto',
    fontSize: '0.9rem',
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    border: '1px solid #1e293b',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    maxHeight: '600px',
    overflowY: 'auto',
    color: '#e2e8f0' // Light text
};
