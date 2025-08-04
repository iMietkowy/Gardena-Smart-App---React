
export const apiClient = async (url, options = {}) => {
    const finalOptions = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(url, finalOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Błąd serwera: ${response.status}`);
    }
    return response.json().catch(() => ({}));
};