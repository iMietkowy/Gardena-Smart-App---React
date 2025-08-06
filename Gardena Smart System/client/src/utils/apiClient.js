// Zmienna jest ładowana z plików .env, w środowisku produkcyjnym będzie undefined.
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const apiClient = async (url, options = {}) => {
	// W środowisku produkcyjnym URL będzie względny (np. '/api/login').
	// W środowisku deweloperskim będzie to pełny adres (np. 'http://localhost:3001/api/login').
	const fullUrl = VITE_BACKEND_URL ? `${VITE_BACKEND_URL}${url}` : url;

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