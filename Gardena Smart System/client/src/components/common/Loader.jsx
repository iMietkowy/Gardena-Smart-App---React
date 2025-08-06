import React from 'react';

const Loader = ({ message = 'Ładowanie strony...' }) => (
	<div className='loading-indicator'>
		<div className='spinner'></div>
		<p>{message}</p>
	</div>
);

export default Loader;