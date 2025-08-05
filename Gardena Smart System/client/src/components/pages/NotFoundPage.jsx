import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
	const navigate = useNavigate();

	return (
		<div className='not-found-page'>
			<h2>Nie znaleziono strony!</h2>
			<button onClick={() => navigate('/')} className='btn btn--secondary btn--pill'>
				Wróć na stronę główną
			</button>
		</div>
	);
};

export default NotFoundPage;
