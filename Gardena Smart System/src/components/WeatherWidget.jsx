import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

const WeatherWidget = () => {
	const [weatherData, setWeatherData] = useState(null);
	const [locationError, setLocationError] = useState(null);
	const { showToastNotification } = useNotificationContext();

	// Użyj refa do śledzenia, czy pobieranie pogody już się odbyło
	const hasFetchedWeather = useRef(false);

	const fetchWeather = useCallback(
		async (latitude, longitude) => {
			try {
				// Spróbuj wczytać z cache
				const cachedWeather = localStorage.getItem('cachedWeather');
				if (cachedWeather) {
					const { data, timestamp } = JSON.parse(cachedWeather);
					const now = new Date().getTime();
					const CACHE_DURATION = 30 * 1000; //Czas odczytu z cache

					if (now - timestamp < CACHE_DURATION) {
						setWeatherData(data);
						console.log('Pogoda pobrana z cache.');
						return; // Użyj danych z cache
					}
				}

				// Jeśli brak w cache lub cache przestarzały, pobierz nowe dane
				const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Nie udało się pobrać danych pogodowych.');
				}
				const data = await response.json();
				setWeatherData(data);
				localStorage.setItem('cachedWeather', JSON.stringify({ data, timestamp: new Date().getTime() }));
				console.log('Pogoda pobrana z API i zapisana w cache.');
			} catch (error) {
				console.error('Błąd pobierania pogody:', error);
				showToastNotification(`Błąd pogody: ${error.message}`, 'error');
				setLocationError('Nie udało się pobrać danych pogodowych.');
			}
		},
		[showToastNotification]
	);

	useEffect(() => {
		// Sprawdźa, czy już pobrano pogodę lub czy jest już w cache
		const cachedWeather = localStorage.getItem('cachedWeather');
		if (hasFetchedWeather.current && cachedWeather) {
			return;
		}

		if (navigator.geolocation) {
			const geoOptions = {
				enableHighAccuracy: false,
				timeout: 5000,
				maximumAge: 5 * 60 * 1000, // Użyj cached position jeśli nie starsza niż 5 minut
			};

			navigator.geolocation.getCurrentPosition(
				position => {
					if (!hasFetchedWeather.current) {
						// Dodatkowe sprawdzenie, aby uniknąć wielokrotnego wywołania
						hasFetchedWeather.current = true; // Ustaw flagę, że zapytanie zostało zainicjowane
						fetchWeather(position.coords.latitude, position.coords.longitude);
					}
				},
				error => {
					console.error('Błąd geolokalizacji:', error);
					let errorMessage = 'Nie można uzyskać Twojej lokalizacji dla prognozy pogody.';
					if (error.code === error.PERMISSION_DENIED) {
						errorMessage =
							'Odmówiono dostępu do lokalizacji. Aby zobaczyć pogodę, zezwól na dostęp w ustawieniach przeglądarki.';
					} else if (error.code === error.POSITION_UNAVAILABLE) {
						errorMessage = 'Informacje o lokalizacji są niedostępne.';
					} else if (error.code === error.TIMEOUT) {
						errorMessage = 'Przekroczono czas oczekiwania na lokalizację.';
					}
					setLocationError(errorMessage);
					showToastNotification(`Lokalizacja: ${errorMessage}`, 'info');
				},
				geoOptions
			);
		} else {
			setLocationError('Twoja przeglądarka nie obsługuje geolokalizacji.');
			showToastNotification('Twoja przeglądarka nie obsługuje geolokalizacji.', 'info');
		}
	}, [fetchWeather]);

	if (locationError) {
		return <div className='weather-widget error-message'>{locationError}</div>;
	}

	if (!weatherData) {
		return (
			<div className='weather-widget loading-indicator'>
				<div className='spinner'></div>
				<p>Ładowanie pogody...</p>
			</div>
		);
	}

	return (
		<div className='weather-widget'>
			<h3>Pogoda w {weatherData.name}:</h3>
			<p>
				Temperatura: <span>{weatherData.main.temp.toFixed(1)}</span>°C
			</p>
			<p>
				Warunki: <span>{weatherData.weather[0].description}</span>
			</p>

			{/* Ostrzeżenie o przymrozku, jeśli temperatura jest niska */}
			{weatherData.main.temp < 2 && ( // Próg np. 2°C, aby ostrzec przed przymrozkiem
				<p className='weather-warning frost-warning'>Uwaga: Możliwy przymrozek!</p>
			)}

			{/* Informacja o opadach deszczu i ostrzeżenie o dużych opadach */}
			{weatherData.rain && (
				<>
					{weatherData.rain['1h'] && (
						<>
							<p>
								Opady deszczu (ostatnia godzina): <span>{weatherData.rain['1h']}</span> mm
							</p>
							{weatherData.rain['1h'] >= 5 && (
								<p className='weather-warning heavy-rain-warning'>Uwaga: Duże opady deszczu!</p>
							)}
						</>
					)}
					{weatherData.rain['3h'] && !weatherData.rain['1h'] && (
						<>
							<p>
								Opady deszczu (ostatnie 3 godziny): <span>{weatherData.rain['3h']}</span> mm
							</p>
							{weatherData.rain['3h'] >= 5 && (
								<p className='weather-warning heavy-rain-warning'>Uwaga: Duże opady deszczu!</p>
							)}
						</>
					)}
				</>
			)}

			{/* Informacja o opadach śniegu i ostrzeżenie o dużych opadach */}
			{weatherData.snow && (
				<>
					{weatherData.snow['1h'] && (
						<>
							<p>
								Opady śniegu (ostatnia godzina): <span>{weatherData.snow['1h']}</span> mm
							</p>
							{weatherData.snow['1h'] >= 5 && (
								<p className='weather-warning heavy-snow-warning'>Uwaga: Duże opady śniegu!</p>
							)}
						</>
					)}
					{weatherData.snow['3h'] && !weatherData.snow['1h'] && (
						<>
							<p>
								Opady śniegu (ostatnie 3 godziny): <span>{weatherData.snow['3h']}</span> mm
							</p>
							{weatherData.snow['3h'] >= 5 && (
								<p className='weather-warning heavy-snow-warning'>Uwaga: Duże opady śniegu!</p>
							)}
						</>
					)}
				</>
			)}

			<img
				src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
				alt={weatherData.weather[0].description}
			/>
		</div>
	);
};

export default WeatherWidget;
