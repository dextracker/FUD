/** @format */

import React, { useEffect, useState } from 'react';
import lottie from 'lottie-web';
import './App.css';
import { OpenAIClient } from 'openai-fetch';
import DOMpurify from 'dompurify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';

const client = new OpenAIClient({
	apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

function App() {
	const [output, setOutput] = useState('');
	const [promptOutput, setPromptOutput] = useState('');
	const [placeholder, setPlaceholder] = useState('');
	const [htmlContent, setHtmlContent] = useState('');
	const [value, setValue] = useState('');
	const [location, setLocation] = useState<{
		latitude: number;
		longitude: number;
	}>({ latitude: 0, longitude: 0 });
	
	const [settingsVisible, setSettingsVisible] = useState(false);
	const [dropdownOneValue, setDropdownOneValue] = useState('');
	const [dropdownTwoValue, setDropdownTwoValue] = useState('');
	const [dropdownThreeValue, setDropdownThreeValue] = useState('');

	const toggleSettings = () => {
		setSettingsVisible(!settingsVisible);
	  };

	const [suggestedRecipes, setSuggestedRecipes] = useState<string[]>([]);

	interface Coords {
		latitude: number;
		longitude: number;
	}

	interface Position {
		coords: Coords;
	}

	interface Location {
		city: string;
		state: string;
		country: string;
	}

	useEffect(() => {
		if (output != '') {
			const intervalId = setInterval(async () => {
				location
					? await reloadPlaceholderText()
					: (() => {
							console.log('No Location');
					  })();
			}, 5000); // Change the placeholder text every 2000 milliseconds (2 seconds)
			return () => clearInterval(intervalId);
		}
	}, [output]);

	async function getLocation(): Promise<Position> {
		return new Promise((resolve, reject) => {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(resolve, reject);
			} else {
				reject(new Error('Geolocation not supported'));
			}
		});
	}

	async function handleGetLocation() {
		try {
			const position: Position = await getLocation();
			const { latitude, longitude } = position.coords;
			setLocation({ latitude, longitude });
			await getCleverTextPlaceholder({ latitude, longitude });
		} catch (error) {
			console.log('Unable to retrieve your location', error);
		}
	}

	async function reloadPlaceholderText() {
		try {
			await getCleverTextPlaceholder(location);
		} catch (error) {
			console.log('Unable to retrieve your location', error);
		}
	}

	// Assuming setLocation is defined somewhere in your component like:
	// const [location, setLocation] = useState<Coords | null>(null);

	const handleLoad = async () => {
		lottie.loadAnimation({
			container: document.querySelector('#animation') as Element, // the dom element that will contain the animation
			renderer: 'svg',
			loop: false,
			autoplay: true,
			path: 'FUD_FRONT_PAGE_90_FPS.json', // the path to the animation json
		});
		await handleGetLocation();
	};

	const handleKeyDown = (e: { key: string }) => {
		if (e.key === 'Enter') {
			lottie.loadAnimation({
				name: 'loading',
				container: document.querySelector('#loading') as Element, // the dom element that will contain the animation
				renderer: 'svg',
				loop: true,
				autoplay: true,
				path: 'FUD_LOADING_90_FPS.json', // the path to the animation json
			});
			talkToGPT();
		}
		if (e.key === ' ') {
			if (output === '') {
				setOutput(placeholder);
			}
		}
	};

	async function talkToGPT() {
		const query = `NOTICE: Please provide a recipe using these ingedients [${output}] for ${dropdownOneValue}. Make it ${dropdownTwoValue} and ${dropdownThreeValue}.  The response should adhere to the following formatting guidelines:
                  1. **Content**:
                    - Recipe only, with no additional comments.
                    - Include a description and historical background of the dish at the end.
                  2. **Styling**:
                    - Enclose everything in a styled \`div\` with inline CSS for HTML rendering.
                    - Use a professional style optimized for mobile viewing.
                    - Create distinct sections for different parts of the content.
                  3. **Container**:
                    - Use styled containers for individual ingredients, instructions, etc., and a grouped container for each section.
                    - Rounded corners.
                    - Scrollable.
                    - Apply transparency to the main colors for containers to look smooth.
                    - Add colored rounded boxes round each title, only around the title, and around the group.
                  Ensure that the styles only affect elements within the div.
                  `;

		try {
			let response = await client.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful ai chef assitant who generates new and personalized recipes',
					},
					{
						role: 'user',
						content: query,
					},
				],
			});

			setPromptOutput(response.message.content!);
			setHtmlContent(response.message.content!);
			lottie.destroy('loading');
		} catch (error) {
			console.error('Error:', error);
		}
	}

	async function getReverseGeocodingData(coords: Coords): Promise<Location> {
		try {
			// const response = await fetch(
			//   `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`
			// );

			const response = await fetch('');

			if (!response.ok) {
				console.error('Network response was not ok ' + response.statusText);
			}

			const data = await response.json();
			const address = data.address;
			const location: Location = {
				city: address.city || address.town || address.village || 'Unknown',
				state: address.state || 'Unknown',
				country: address.country || 'Unknown',
			};

			return location;
		} catch (error) {
			//console.error('Error getting location data:', error);
			const location: Location = {
				city: 'Unknown',
				state: 'Unknown',
				country: 'Unknown',
			};
			return location;
		}
	}

	async function getCleverTextPlaceholder(_location: Coords) {
		const location: Location = await getReverseGeocodingData(_location);
		const locationString =
			location.country === 'Unknown'
				? ''
				: `${location.country}`;
		const suggestedRecipesString = suggestedRecipes
			? ''
			: `exclude:[${suggestedRecipes}]`;
		const query = `
      provide 10 ingredients from ${locationString} popular around ${new Date().toDateString()}. ${suggestedRecipesString}.
      Only respond with a list of ingredients separated by commas and all enclosed in "". nothing else.
    `;
		try {
			let response = await client.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content: 'assistant',
					},
					{
						role: 'user',
						content: query,
					},
				],
			});
			setPlaceholder(response.message.content!.replace(/"/g, ''));

			suggestedRecipes?.push(response.message.content!.replace(/"/g, ''));
		} catch (error) {
			console.error('Error:', error);
		}
	}

	window.onload = handleLoad;

	return (
		<div className="App">
			<div className="rectangle">
				<div id="animation" style={{ width: '100%', height: '100%' }}></div>
				<div className="output-window">
					<input
						type="text"
						placeholder={placeholder}
						value={output}
						onChange={(e) => {
							setOutput(e.target.value);
						}}
						id="inputbox"
						onKeyDown={handleKeyDown}
						className="text-input"
					/>
					<FontAwesomeIcon icon={faCog} onClick={toggleSettings} className="gear-icon" />
  					{settingsVisible && (
    					<div className="settings-menu">
      					<select onChange={(e) => setDropdownOneValue(e.target.value)}>
        					<option value="">--Select Meal--</option>
							<option value="breakfast">Breakfast</option>
							<option value="lunch">Lunch</option>
							<option value="dinner">Dinner</option>
        					{/* Add options here */}
      					</select>
      					<select onChange={(e) => setDropdownTwoValue(e.target.value)}>
        					<option value="">--Select Flavor 1--</option>
							<option value="sweet">Sweet</option>
							<option value="spicy">Spicy</option>
							<option value="sour">Sour</option>
							<option value="savory">Savory</option>
							{/* Add options here */}
      					</select>
      					<select onChange={(e) => setDropdownThreeValue(e.target.value)}>
						  <option value="">--Select Flavor 2--</option>
							<option value="sweet">Sweet</option>
							<option value="spicy">Spicy</option>
							<option value="sour">Sour</option>
							<option value="savory">Savory</option>
        					{/* Add options here */}
      					</select>
    					</div>
  					)}
				</div>
				<>
					<div id="loading" style={{ width: '100%', height: '100%' }}></div>

					{promptOutput ? (
						<>
							<div
								style={{ overflow: 'auto', maxHeight: '500px' }}
								dangerouslySetInnerHTML={{ __html: htmlContent }}
							></div>
							{/* <ReactMarkdown className="output-window">
                {promptOutput.toString()}
              </ReactMarkdown> */}
						</>
					) : (
						<></>
					)}
				</>
			</div>
		</div>
	);
}

export default App;
