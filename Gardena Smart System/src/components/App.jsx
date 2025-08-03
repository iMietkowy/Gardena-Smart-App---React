import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useNotificationContext } from '../context/NotificationContext';
import '../scss/main.scss';

// Importy komponentów stron
import HomePage from './HomePage';
import DeviceList from './DeviceList';
import DeviceDetailPage from './DeviceDetailPage';
import SchedulePage from './SchedulePage';
import NotFoundPage from './NotFoundPage';
import LoginPage from './LoginPage';

// Importy dla karuzeli statusów w nagłówku
import Slider from 'react-slick';
// Style slick-carousel są importowane w src/main.jsx, aby uniknąć problemów z @charset

// Importy dla ikon
import { Bell, Menu, Sun, Moon, LogOut } from 'lucide-react';
import gardenaLogo from '../img/logo.svg';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Inne hooki i utility
import ToastNotification from './ToastNotification';
import { useClickOutside } from '../hooks/useClickOutside';
import { getConsolidatedDeviceStatus } from '../utils/statusUtils';
import { useWindowWidth } from '../hooks/useWindowWidth';

library.add(fas, fab);

const App = () => {
	const { loading, error, devices, theme, toggleTheme, isAuthenticated, logout, checkAuthStatus } = useAppContext();
	const { notifications, toastNotifications, dismissToast, markNotificationAsRead, setNotifications } =
		useNotificationContext();

	const navigate = useNavigate();
	const location = useLocation();
	const windowWidth = useWindowWidth();

	const [showNotificationPopup, setShowNotificationPopup] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const notificationPopupRef = useRef(null);
	const notificationBellButtonRef = useRef(null);
	const mobileNavRef = useRef(null);
	const hamburgerButtonRef = useRef(null);

	useEffect(() => {
		checkAuthStatus();
	}, [checkAuthStatus]);

	useClickOutside([notificationPopupRef, notificationBellButtonRef], () => {
		setShowNotificationPopup(false);
	});
	useClickOutside([mobileNavRef, hamburgerButtonRef], () => {
		setIsMenuOpen(false);
	});

	const unreadNotificationsCount = notifications.filter(notif => !notif.read).length;

	// Ustawienia dla karuzeli statusów w nagłówku
	const settings = {
		dots: false,
		infinite: true,
		speed: 500,
		slidesToShow: 3,
		slidesToScroll: 1,
		autoplay: true,
		autoplaySpeed: 4000,
		arrows: false,
		responsive: [
			{
				breakpoint: 1650,
				settings: {
					slidesToShow: 2,
					slidesToScroll: 1,
					infinite: false,
					autoplay: false,
				},
			},
			{
				breakpoint: 1430,
				settings: {
					slidesToShow: 1,
					slidesToScroll: 1,
					infinite: false,
					autoplay: false,
				},
			},
			{
				breakpoint: 992,
				settings: {
					slidesToShow: 1,
					slidesToScroll: 1,
					infinite: false,
					autoplay: false,
				},
			},
		],
	};

	const handleNavigate = path => {
		navigate(path);
		setIsMenuOpen(false);
	};

	const DevicesPage = () => {
		if (loading)
			return (
				<div className='loading-indicator'>
					<div className='spinner'></div>
					<p>Ładowanie urządzeń...</p>
				</div>
			);
		if (error)
			return (
				<div className='error-message'>
					<p className='error-title'>Błąd:</p>
					<p>{error}</p>
					<button onClick={() => handleNavigate('/')} className='btn btn--secondary btn--pill'>
						Wróć
					</button>
				</div>
			);
		return <DeviceList />;
	};

	if (isAuthenticated === null) {
		return (
			<div className='app-container'>
				<div className='loading-indicator'>
					<div className='spinner'></div>
					<p>Sprawdzanie autoryzacji...</p>
				</div>
			</div>
		);
	}

	if (isAuthenticated === false) {
		return (
			<div className='app-container'>
				<Routes>
					<Route path='*' element={<LoginPage />} />
				</Routes>
			</div>
		);
	}

	// Dynamiczne ustawienia dla slajdera, aby był statyczny przy małej liczbie urządzeń
	const dynamicSettings = {
		...settings,
		slidesToShow: devices.length,
		autoplay: devices.length > 3,
		infinite: devices.length > 3,
	};

	if (windowWidth <= 1650) {
		dynamicSettings.slidesToShow = devices.length;
		dynamicSettings.autoplay = devices.length > 2;
		dynamicSettings.infinite = devices.length > 2;
	}

	if (windowWidth <= 1430) {
		dynamicSettings.slidesToShow = devices.length;
		dynamicSettings.autoplay = devices.length > 1;
		dynamicSettings.infinite = devices.length > 1;
	}

	const isStaticLayout = devices.length <= dynamicSettings.slidesToShow && windowWidth > 1430;

	return (
		<div className='app-container'>
			<header className=' app-header'>
				<div className='container'>
					<h1 className='app-title'>
						<img src={gardenaLogo} alt='Logo Gardena' />
					</h1>

					<div className='header-center-section'>
						{error ? (
							<div className='header-center-section-placeholder error-message-header'>
								<p className='error-title-small'>Błąd</p>
								<p>{error}</p>
							</div>
						) : loading ? (
							<div className='header-center-section-placeholder'>
								<div className='spinner small'></div>
								<p>Ładowanie statusów urządzeń...</p>
							</div>
						) : devices.length > 0 ? (
							<div className={isStaticLayout ? 'header-center-section--static-layout' : ''}>
								<Slider {...dynamicSettings}>
									{devices.map(device => {
										const statusInfo = getConsolidatedDeviceStatus(device);
										return (
											<div key={device.id} className='robot-status-indicator-slide'>
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
								</Slider>
							</div>
						) : (
							<div className='header-center-section-placeholder'>
								<p>Brak dostępnych urządzeń.</p>
								<p>Sprawdź połączenie z systemem Gardena.</p>
							</div>
						)}
					</div>

					<div className='header-right-section'>
						<nav className='desktop-nav'>
							<ul>
								<li>
									<button onClick={() => handleNavigate('/')} className={location.pathname === '/' ? 'active' : ''}>
										Strona Główna
									</button>
								</li>
								<li>
									<button
										onClick={() => handleNavigate('/devices')}
										className={
											location.pathname === '/devices' || location.pathname.startsWith('/devices/') ? 'active' : ''
										}
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
							<button onClick={toggleTheme} className='theme-toggle-btn'>
								{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
							</button>
							<div className='notification-area'>
								<button
									className='notification-bell-button'
									onClick={() => setShowNotificationPopup(prev => !prev)}
									ref={notificationBellButtonRef}
								>
									<Bell />
									{unreadNotificationsCount > 0 && (
										<span className='notification-count'>{unreadNotificationsCount}</span>
									)}
								</button>
								{showNotificationPopup && (
									<div className='notification-popup' ref={notificationPopupRef}>
										<div className='notification-popup-header'>
											<h4>Powiadomienia ({unreadNotificationsCount} nieprzeczytanych)</h4>
											{notifications.length > 0 && (
												<button onClick={() => setNotifications([])} className='clear-notifications-btn'>
													Wyczyść wszystkie
												</button>
											)}
										</div>
										{notifications.length > 0 ? (
											<ul>
												{notifications.map(notif => (
													<li
														key={notif.id}
														className={`${notif.type} ${notif.read ? '' : 'unread'}`}
														onClick={() => markNotificationAsRead(notif.id)}
													>
														<span>{notif.message}</span>
														<span className='notification-time'>
															{new Date(notif.timestamp).toLocaleString('pl-PL', {
																hour: '2-digit',
																minute: '2-digit',
																second: '2-digit',
															})}
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
							<button onClick={logout} className='btn-icon-action'>
								<LogOut size={20} />
							</button>
							<button
								className='hamburger-menu-button'
								onClick={() => setIsMenuOpen(prev => !prev)}
								ref={hamburgerButtonRef}
							>
								<Menu size={28} />
							</button>
						</div>
					</div>
				</div>
			</header>

			{isMenuOpen && (
				<nav className='mobile-nav' ref={mobileNavRef}>
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
								className={`mobile-nav-button ${
									location.pathname === '/devices' || location.pathname.startsWith('/devices/') ? 'active' : ''
								}`}
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
