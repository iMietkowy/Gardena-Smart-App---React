import React, { useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useNotificationContext } from '../context/NotificationContext'; 
import '../scss/main.scss';


import DeviceList from './DeviceList';
import DeviceDetailPage from './DeviceDetailPage';
import SchedulePage from './SchedulePage';
import WeatherWidget from './WeatherWidget';
import ToastNotification from './ToastNotification';
import { useClickOutside } from '../hooks/useClickOutside';
import { getConsolidatedDeviceStatus } from '../utils/statusUtils'; 

import { Bell, Menu, Sun, Moon } from 'lucide-react';
import gardenaLogo from '../img/logo.svg';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons'; 
import { fab } from '@fortawesome/free-brands-svg-icons'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 


library.add(fas, fab);

const App = () => {
	const { loading, error, devices, theme, toggleTheme } = useAppContext();
	const {
		notifications,
		toastNotifications,
		dismissToast,
		markNotificationAsRead,
		setNotifications,
	} = useNotificationContext();

	const navigate = useNavigate();
	const location = useLocation();

	const [showNotificationPopup, setShowNotificationPopup] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	
    
	const notificationPopupRef = useRef(null);
	const notificationBellButtonRef = useRef(null);
	const mobileNavRef = useRef(null);
	const hamburgerButtonRef = useRef(null);

  
    useClickOutside([notificationPopupRef, notificationBellButtonRef], () => {
        setShowNotificationPopup(false);
    });

    useClickOutside([mobileNavRef, hamburgerButtonRef], () => {
        setIsMenuOpen(false);
    });

	const unreadNotificationsCount = notifications.filter(notif => !notif.read).length;


	const HomePage = () => (
		<div className='home-page'>
			<h2>Gardena Smart System</h2>
			<p>Tutaj możesz zarządzać swoimi urządzeniami!</p>
			<button onClick={() => navigate('/devices')} className="btn btn--primary btn--pill">Moje urządzenia</button>
			<WeatherWidget />
		</div>
	);
	const DevicesPage = () => {
		if (loading) return <div className='loading-indicator'><div className='spinner'></div><p>Ładowanie urządzeń...</p></div>;
		if (error) return <div className='error-message'><p className='error-title'>Błąd:</p><p>{error}</p><button onClick={() => navigate('/')} className="btn btn--secondary btn--pill">Wróć</button></div>;
		return <DeviceList />;
	};
	const NotFoundPage = () => (
		<div className='not-found-page'>
			<h2>Nie znaleziono strony!</h2>
			<button onClick={() => navigate('/')} className="btn btn--secondary btn--pill">Wróć na stronę główną</button>
		</div>
	);

	const handleNavigate = (path) => {
		navigate(path);
		setIsMenuOpen(false);
	};

	return (
		<div className='app-container'>
			<header className=' app-header'>
				<div className='container'>
					<h1 className='app-title'>
						<img src={gardenaLogo} alt='Logo Gardena' />
					</h1>

					<div className='header-center-section'>
						{devices.map(device => {
							const statusInfo = getConsolidatedDeviceStatus(device);
							return (
								<div key={device.id} className='device-header-status-item'>
									<div className='robot-status-indicator'>
										<span className={`status-dot ${statusInfo.dotClass}`}></span>
										<span className='status-text'>
											<strong>{statusInfo.displayName}</strong>
											{statusInfo.statusMessage}
										</span>
									</div>
								</div>
							);
						})}
					</div>

					<div className='header-right-section'>
                       
						<nav className="desktop-nav">
                            <ul>
                                <li>
                                    <button 
                                        onClick={() => handleNavigate('/')} 
                                        className={location.pathname === '/' ? 'active' : ''}
                                    >
                                        Strona Główna
                                    </button>
                                </li>
                                <li>
                                    <button 
                                        onClick={() => handleNavigate('/devices')} 
                                        className={location.pathname === '/devices' || location.pathname.startsWith('/devices/') ? 'active' : ''}
                                    >
                                        Urządzenia
                                    </button>
                                </li>
                                <li>
                                    <button 
                                        onClick={() => handleNavigate('/schedules')} 
                                        className={location.pathname === '/schedules' ? 'active' : ''}
                                    >
                                        Harmonogram
                                    </button>
                                </li>
                            </ul>
						</nav>
						<div className='header-actions'>
                            <button onClick={toggleTheme} className="theme-toggle-btn">
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
							<div className='notification-area'>
								<button
									className='notification-bell-button'
									onClick={() => setShowNotificationPopup(prev => !prev)}
									ref={notificationBellButtonRef}
								>
									<Bell />
									{unreadNotificationsCount > 0 && <span className='notification-count'>{unreadNotificationsCount}</span>}
								</button>
								{showNotificationPopup && (
									<div className='notification-popup' ref={notificationPopupRef}>
										<div className='notification-popup-header'>
											<h4>Powiadomienia ({unreadNotificationsCount} nieprzeczytanych)</h4>
											{notifications.length > 0 && (
												<button onClick={() => setNotifications([])} className="clear-notifications-btn">
													Wyczyść wszystkie
												</button>
											)}
										</div>
										{notifications.length > 0 ? (
											<ul>
												{notifications.map(notif => (
													<li key={notif.id} className={`${notif.type} ${notif.read ? '' : 'unread'}`} onClick={() => markNotificationAsRead(notif.id)}>
														<span>{notif.message}</span>
														<span className="notification-time">
                                                            {new Date(notif.timestamp).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
													</li>
												))}
											</ul>
										) : (
											<p>Brak powiadomień.</p>
										)}
									</div>
								)}
							</div>
							<button className='hamburger-menu-button' onClick={() => setIsMenuOpen(prev => !prev)} ref={hamburgerButtonRef}>
								<Menu size={28} />
							</button>
						</div>
					</div>
				</div>
			</header>

			{isMenuOpen && (
				<nav className="mobile-nav" ref={mobileNavRef}>
                    <ul>
                        <li>
                            <button 
                                onClick={() => handleNavigate('/')} 
                                className={`mobile-nav-button ${location.pathname === '/' ? 'active' : ''}`}
                            >
                                Strona Główna
                            </button>
                        </li>
                        <li>
                            <button 
                                onClick={() => handleNavigate('/devices')} 
                                className={`mobile-nav-button ${location.pathname === '/devices' || location.pathname.startsWith('/devices/') ? 'active' : ''}`}
                            >
                                Urządzenia
                            </button>
                        </li>
                        <li>
                            <button 
                                onClick={() => handleNavigate('/schedules')} 
                                className={`mobile-nav-button ${location.pathname === '/schedules' ? 'active' : ''}`}
                            >
                                Harmonogram
                            </button>
                        </li>
                    </ul>
				</nav>
			)}

			<main className='app-main'>
				<Routes>
					<Route path='/' element={<HomePage />} />
					<Route path='/devices' element={<DevicesPage />} />
					<Route path='/devices/:deviceId' element={<DeviceDetailPage />} />
					<Route path='/schedules' element={<SchedulePage />} />
					<Route path='*' element={<NotFoundPage />} />
				</Routes>
			</main>
			<div className='toast-notification-container'>
				{toastNotifications.map(toast => (
					<ToastNotification key={toast.id} {...toast} onDismiss={dismissToast} />
				))}
			</div>
			<footer className='app-footer'>
				<div className='app-footer-links'>
					<a href='https://www.facebook.com/Gardena.Polska/?locale=pl_PL' target='_blank'>
						<FontAwesomeIcon icon={['fab', 'facebook']} size='2x' />
					</a>
					<a href='https://www.youtube.com/channel/UC4KIy1MQ9ASlglH8cYuS2NQ' target='_blank'>
						<FontAwesomeIcon icon='fab fa-youtube' size='2x' />
					</a>

					<a
						href='https://www.gardena.com/pl/c/wsparcie-techniczne/kupuj-produkty/wyszukiwarka-sklepow?srsltid=AfmBOorSgPYIo1jK8RgXFxzPnHwpq3lyG4yF_MCed_ESztyIVSvD-Vai'
						target='_blank'
					>
						<FontAwesomeIcon icon='fas fa-shopping-cart' size='2x' />
					</a>
				</div>
				<p>© {new Date().getFullYear()} Smart Garden App. Wszelkie prawa zastrzeżone.</p>
			</footer>
		</div>
	);
};

export default App;