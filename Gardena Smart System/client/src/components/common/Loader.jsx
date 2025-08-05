import React from 'react';

const Loader = () => (
	<div className='loading-indicator'>
		<div className='spinner'></div>
		<p>{message}</p>
	</div>
);

export default Loader;
