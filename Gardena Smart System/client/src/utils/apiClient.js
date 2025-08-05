
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const apiClient = async (url, options = {}) => {
    // Dodana linia do diagnostyki
    console.log('Adres URL, z którego pobierane są dane:', BASE_URL);

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