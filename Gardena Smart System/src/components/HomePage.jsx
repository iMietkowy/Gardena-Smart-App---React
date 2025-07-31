import React from 'react';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from './WeatherWidget';

const HomePage = () => {
	const navigate = useNavigate();

	return (
		<div className='home-page'>
			<div className='home-page-main-content'>
				<h2>Gardena Smart System</h2>
				<p>Tutaj możesz zarządzać swoimi urządzeniami!</p>
				<button onClick={() => navigate('/devices')} className='btn btn--primary btn--pill'>
					Moje urządzenia
				</button>

				<div className='home-page-weather-widget-centered'>
					<WeatherWidget />
				</div>
			</div>
		</div>
	);
};

export default HomePage;
