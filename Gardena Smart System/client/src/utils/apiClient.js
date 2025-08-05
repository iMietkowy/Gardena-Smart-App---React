
const BASE_URL = 'https://gardena-smart-app-server.onrender.com';

export const apiClient = async (url, options = {}) => {
    const fullUrl = `${BASE_URL}${url}`;

    const finalOptions = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(fullUrl, finalOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Błąd serwera: ${response.status}`);
    }
    return response.json().catch(() => ({}));
};