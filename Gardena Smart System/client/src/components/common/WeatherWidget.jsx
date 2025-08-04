import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';


const WeatherWidget = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const { showToastNotification } = useNotificationContext();

    const hasFetchedWeather = useRef(false);

    const fetchWeather = useCallback(async (latitude, longitude) => {
        try {
            const cachedWeather = localStorage.getItem('cachedWeather');
            if (cachedWeather) {
                const { data, timestamp } = JSON.parse(cachedWeather);
                const now = new Date().getTime();
                
                const CACHE_DURATION = 30 * 1000; // 30 sekund w milisekundach 

                if (now - timestamp < CACHE_DURATION) {
                    setWeatherData(data);
                    console.log('Pogoda pobrana z cache.');
                    return;
                }
            }

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
            console.error("Błąd pobierania pogody:", error);
            showToastNotification(`Błąd pogody: ${error.message}`, 'error');
            setLocationError("Nie udało się pobrać danych pogodowych.");
        }
    }, [showToastNotification]);

    useEffect(() => {
        const cachedWeather = localStorage.getItem('cachedWeather');
        if (hasFetchedWeather.current && cachedWeather) {
            return;
        }

        if (navigator.geolocation) {
            const geoOptions = {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 5 * 60 * 1000
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!hasFetchedWeather.current) {
                        hasFetchedWeather.current = true;
                        fetchWeather(position.coords.latitude, position.coords.longitude);
                    }
                },
                (error) => {
                    console.error("Błąd geolokalizacji:", error);
                    let errorMessage = "Nie można uzyskać Twojej lokalizacji dla prognozy pogody.";
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMessage = "Odmówiono dostępu do lokalizacji. Aby zobaczyć pogodę, zezwól na dostęp w ustawieniach przeglądarki.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMessage = "Informacje o lokalizacji są niedostępne.";
                    } else if (error.code === error.TIMEOUT) {
                        errorMessage = "Przekroczono czas oczekiwania na lokalizację.";
                    }
                    setLocationError(errorMessage);
                    showToastNotification(`Lokalizacja: ${errorMessage}`, 'info');
                },
                geoOptions
            );
        } else {
            setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
            showToastNotification("Twoja przeglądarka nie obsługuje geolokalizacji.", 'info');
        }
    }, [fetchWeather]);

    if (locationError) {
        return <div className="weather-widget error-message">{locationError}</div>;
    }

    if (!weatherData) {
        return (
            <div className="weather-widget loading-indicator">
                <div className="spinner"></div>
                <p>Ładowanie pogody...</p>
            </div>
        );
    }

    return (
        <div className="weather-widget">
            <h3>Pogoda w {weatherData.name}:</h3>
            <img
                src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
                alt={weatherData.weather[0].description}
            />
            
            {/* Kontener dla statusów pogodowych - weather-status-grid */}
            <div className="weather-status-grid">
                <p>Temperatura: {weatherData.main.temp.toFixed(1)}°C</p>
                <p>Odczuwalna: {weatherData.main.feels_like.toFixed(1)}°C</p>
                <p>Warunki: {weatherData.weather[0].description}</p>
                
                {/* Ostrzeżenie o przymrozku, jeśli temperatura jest niska */}
                {weatherData.main.temp < 2 && ( 
                    <p className="weather-warning frost-warning full-width">Uwaga: Możliwy przymrozek!</p>
                )}
                {/* Informacja o opadach deszczu i ostrzeżenie o dużych opadach */}
                
                {weatherData.rain && (
                    <>
                        {weatherData.rain['1h'] && (
                            <>
                                <p>Opady deszczu (1h): {weatherData.rain['1h']} mm</p>
                                {weatherData.rain['1h'] >= 5 && (
                                    <p className="weather-warning heavy-rain-warning full-width">Uwaga: Duże opady deszczu!</p>
                                )}
                            </>
                        )}
                        {weatherData.rain['3h'] && !weatherData.rain['1h'] && (
                            <>
                                <p>Opady deszczu (3h): {weatherData.rain['3h']} mm</p>
                                {weatherData.rain['3h'] >= 5 && (
                                    <p className="weather-warning heavy-rain-warning full-width">Uwaga: Duże opady deszczu!</p>
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
                                <p>Opady śniegu (1h): {weatherData.snow['1h']} mm</p>
                                {weatherData.snow['1h'] >= 5 && (
                                    <p className="weather-warning heavy-snow-warning full-width">Uwaga: Duże opady śniegu!</p>
                                )}
                            </>
                        )}
                        {weatherData.snow && weatherData.snow['3h'] && !weatherData.snow['1h'] && (
                            <>
                                <p>Opady śniegu (3h): {weatherData.snow['3h']} mm</p>
                                {weatherData.snow['3h'] >= 5 && (
                                    <p className="weather-warning heavy-snow-warning full-width">Uwaga: Duże opady śniegu!</p>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;