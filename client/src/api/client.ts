
export const getAuthToken = () => localStorage.getItem('auth_token');
export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('auth_token');

export async function apiClient(url: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
        if (response.status === 401) {
            removeAuthToken();
            // Optional: window.location.href = '/login';
        }
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || `API Error: ${response.status}`);
        } catch (e: any) {
            throw new Error(e.message || `API Error: ${response.status} - ${errorText}`);
        }
    }

    // Return null for 204 No Content
    if (response.status === 204) return null;

    return response.json();
}
