import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder = '-- Wybierz --' }) => {
	const [isOpen, setIsOpen] = useState(false);
	const selectRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = event => {
			if (selectRef.current && !selectRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleOptionClick = optionValue => {
		onChange(optionValue);
		setIsOpen(false);
	};

	const selectedOption = options.find(option => option.value === value);
	const displayLabel = selectedOption ? selectedOption.label : placeholder;

	return (
		<div className='custom-select-container' ref={selectRef}>
			<button
				type='button'
				className={`custom-select-button ${isOpen ? 'open' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
				aria-haspopup='listbox'
				aria-expanded={isOpen}
			>
				<span>{displayLabel}</span>
				<ChevronDown className='custom-select-arrow' size={20} />
			</button>
			{isOpen && (
				<ul className='custom-select-options' role='listbox'>
					{options.map(option => (
						<li
							key={option.value}
							className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
							onClick={() => handleOptionClick(option.value)}
							role='option'
							aria-selected={option.value === value}
						>
							{option.label}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default CustomSelect;
