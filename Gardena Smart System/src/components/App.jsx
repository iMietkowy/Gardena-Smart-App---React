import React, { useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useNotificationContext } from '../context/NotificationContext';
import '../scss/main.scss';

// Importy komponentów stron
import HomePage from './HomePage';
import DeviceList from './DeviceList';
import DeviceDetailPage from './DeviceDetailPage';
import SchedulePage from './SchedulePage';
import NotFoundPage from './NotFoundPage'; // Upewnij się, że ten plik istnieje

// Importy dla karuzeli statusów w nagłówku
import Slider from 'react-slick';
// Style slick-carousel są teraz importowane w src/main.jsx, aby uniknąć problemów z @charset

// Importy dla ikon
import { Bell, Menu, Sun, Moon } from 'lucide-react';
import gardenaLogo from '../img/logo.svg';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Inne hooki i utility
import ToastNotification from './ToastNotification';
import { useClickOutside } from '../hooks/useClickOutside';
import { getConsolidatedDeviceStatus } from '../utils/statusUtils';

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

    // Ustawienia dla karuzeli statusów w nagłówku
    const settings = {
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow: 3, // Domyślnie dla bardzo szerokich ekranów
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        arrows: false,
        responsive: [
            {
                breakpoint: 1650, // Zmieniony breakpoint
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 1430, // Zmieniony breakpoint
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
            }
        ]
    };
    
	const handleNavigate = (path) => {
		navigate(path);
		setIsMenuOpen(false);
	};
    
    // Tworzenie komponentów stron wewnątrz App
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

    const isSliderEnabled = devices.length > 1;

	return (
		<div className='app-container'>
			<header className=' app-header'>
				<div className='container'>
					<h1 className='app-title'>
						<img src={gardenaLogo} alt='Logo Gardena' />
					</h1>

                    {/* Sekcja karuzeli statusów urządzeń w nagłówku */}
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
                            // Dodatkowa klasa do kontenera, gdy slajder jest statyczny
                            <div className={devices.length <= settings.slidesToShow ? 'header-center-section--static-layout' : ''}>
                                <Slider
                                    {...settings}
                                    slidesToShow={Math.min(devices.length, settings.slidesToShow)}
                                    slidesToScroll={Math.min(devices.length, settings.slidesToScroll)}
                                    autoplay={devices.length > settings.slidesToShow}
                                    infinite={devices.length > settings.slidesToShow}
                                >
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
