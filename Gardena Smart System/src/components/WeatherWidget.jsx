import React, { useEffect, useState, useCallback } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

const WeatherWidget = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const { showToastNotification } = useNotificationContext();

    const fetchWeather = useCallback(async (latitude, longitude) => {
        try {
            // Spróbuj wczytać z cache
            const cachedWeather = localStorage.getItem('cachedWeather');
            if (cachedWeather) {
                const { data, timestamp } = JSON.parse(cachedWeather);
                const now = new Date().getTime();
                const CACHE_DURATION = 10 * 60 * 1000; // 10 minut w milisekundach

                if (now - timestamp < CACHE_DURATION) {
                    setWeatherData(data);
                    console.log('Pogoda pobrana z cache.');
                    return; 
                }
            }

            // Jeśli brak w cache lub cache przestarzały, pobierz nowe dane
            const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
           

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Nie udało się pobrać danych pogodowych.');
            }
            const data = await response.json();
            setWeatherData(data);
            localStorage.setItem('cachedWeather', JSON.stringify({ data, timestamp: new Date().getTime() }));
            console.log('Pogoda pobrana z API i zapisana w cache.');

        } catch (error) {
            console.error("Błąd pobierania pogody:", error);
            showToastNotification(`Błąd pogody: ${error.message}`, 'error');
            setLocationError("Nie udało się pobrać danych pogodowych.");
        }
    }, [showToastNotification]);

	 useEffect(() => {
        if (navigator.geolocation) {
            const geoOptions = {
                enableHighAccuracy: false, 
                timeout: 5000,           // Czas oczekiwania na lokalizację (5 sekund)
                maximumAge: 5 * 60 * 1000 // Użyj cached position jeśli nie starsza niż 5 minut
            };

			navigator.geolocation.getCurrentPosition(
				async position => {
					const { latitude, longitude } = position.coords;
					try {
						const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
						if (!response.ok) {
							const errorData = await response.json();
							throw new Error(errorData.error || 'Nie udało się pobrać danych pogodowych.');
						}
						const data = await response.json();
						setWeatherData(data);
					} catch (error) {
						console.error('Błąd pobierania pogody:', error);
						showToastNotification(`Błąd pogody: ${error.message}`, 'error');
						setLocationError('Nie udało się pobrać danych pogodowych.');
					}
				},

				error => {
					console.error('Błąd geolokalizacji:', error);
					let errorMessage = 'Nie można uzyskać Twojej lokalizacji dla prognozy pogody.';
					if (error.code === error.PERMISSION_DENIED) {
						errorMessage =
							'Odmówiono dostępu do lokalizacji. Aby zobaczyć pogodę, zezwól na dostęp w ustawieniach przeglądarki.';
					}
					setLocationError(errorMessage);
					showToastNotification(`Lokalizacja: ${errorMessage}`, 'info');
				}
			);
		} else {
			setLocationError('Twoja przeglądarka nie obsługuje geolokalizacji.');
			showToastNotification('Lokalizacja: Twoja przeglądarka nie obsługuje geolokalizacji.', 'info');
		}
	}, [fetchWeather]);

	if (locationError) {
		return <div className='weather-widget error-message'>{locationError}</div>;
	}

	if (!weatherData) {
		return <div className='weather-widget loading-indicator'>
            <div className='spinner'></div>
            <p>Ładowanie pogody...</p>
        </div>;
	}
   
	return (
		<div className='weather-widget'>
			<h3>Pogoda w {weatherData.name}:</h3>
			<p>Temperatura: {weatherData.main.temp}°C</p>
			<p>Odczuwalna: {weatherData.main.feels_like}°C</p>
			<p>Warunki: {weatherData.weather[0].description}</p>
			<img
				src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
				alt={weatherData.weather[0].description}
			/>
		</div>
	);
};

export default WeatherWidget;
