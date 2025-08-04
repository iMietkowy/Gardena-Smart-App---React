import React from 'react';

const ParkMowerModal = ({ onConfirm, onCancel, isSubmitting }) => {
	return (
		<div className='modal-overlay'>
			<div className='modal-content'>
				<h4 className='modal-title'>Wybierz rodzaj parkowania</h4>
				<p className='modal-message'>
					Wybierz, czy kosiarka ma zaparkować do następnego zaplanowanego zadania, czy pozostać w stacji dokującej do
					odwołania.
				</p>
				<div className='modal-actions vertical'>
					<button
						type='button'
						onClick={() => onConfirm('parkUntilNextTask')}
						className='btn btn--primary btn--rounded'
						disabled={isSubmitting}
					>
						Zgodnie z harmonogramem
					</button>
					<button
						type='button'
						onClick={() => onConfirm('parkUntilFurtherNotice')}
						className='btn btn--primary btn--rounded'
						disabled={isSubmitting}
					>
						Do odwołania
					</button>
					<button type='button' onClick={onCancel} className='btn btn--secondary btn--rounded' disabled={isSubmitting}>
						Anuluj
					</button>
				</div>
			</div>
		</div>
	);
};

export default ParkMowerModal;
