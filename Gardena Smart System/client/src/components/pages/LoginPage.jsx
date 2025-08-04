import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import gardenaLogo from '@/assets/img/logo.svg';
import { Sun, Moon } from 'lucide-react';

const LoginPage = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState(null);
	const { login, theme, toggleTheme } = useAppContext();
	const navigate = useNavigate();

	const handleSubmit = async e => {
		e.preventDefault();
		setError(null);

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Błąd logowania');
			}

			const data = await response.json();
			login(data.username); // Zaktualizuj stan autoryzacji w kontekście
			navigate('/'); // Przekieruj na stronę z urządzeniami
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<div className='login-page'>
			<div className='login-container'>
				<button onClick={toggleTheme} className='theme-toggle-btn login-page-toggle'>
					{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
				</button>
				<img src={gardenaLogo} alt='Logo Gardena' className='login-logo' />
				<h1 className='app-title-login'>Smart Gardena App</h1>
				<h2>Zaloguj się</h2>
				<form onSubmit={handleSubmit}>
					<div className='form-group'>
						<label htmlFor='username'>Nazwa użytkownika</label>
						<input type='text' id='username' value={username} onChange={e => setUsername(e.target.value)} required />
					</div>
					<div className='form-group'>
						<label htmlFor='password'>Hasło</label>
						<input
							type='password'
							id='password'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
						/>
					</div>
					{error && <div className='error-message'>{error}</div>}
					<button type='submit' className='btn btn--primary'>
						Zaloguj
					</button>
				</form>
			</div>
		</div>
	);
};

export default LoginPage;
