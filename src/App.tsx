/** @format */

import React, { useEffect, useState } from 'react';
import lottie from 'lottie-web';
import './App.css';
import { OpenAIClient } from 'openai-fetch';
import DOMpurify from 'dompurify';

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
			}, 15000); // Change the placeholder text every 2000 milliseconds (2 seconds)
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
		const query = `NOTICE: Please provide a recipe for ${output} including a description and historical background of the dish. The response should adhere to the following formatting guidelines:
                  1. **Content**:
                    - Recipe only, with no additional comments.
                    - Include a description and historical background of the dish at the end.
                  2. **Styling**:
                    - Enclose everything in a styled \`div\` with inline CSS for HTML rendering.
                    - Use a professional style optimized for mobile viewing.
                    - Create distinct sections for different parts of the content.
                  3. **Colors**:
                    - Main colors: #B0DF94, #F9C6C5, #BCDEF2, #FAEF86.
                    - Light text against dark backgrounds.
                    - Avoid using green or pink for the text.
                  4. **Typography**:
                    - Include a large title.
                    - Align all text to the left.
                    - Use styled containers for individual ingredients, instructions, etc., and a grouped container for each section.
                  5. **Container**:
                    - Rounded corners.
                    - Scrollable.
                    - Apply transparency to the main colors for a professional look.
                  Ensure that the styles only affect elements within the div. Thank you.
                  `;

		try {
			let response = await client.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful ai chef assitant who generates new recipes and suggest recipes based on various factors about a person',
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
			location.city === 'Unknown' &&
			location.state === 'Unknown' &&
			location.country === 'Unknown'
				? ''
				: `the location ${location.city}, ${location.state}, ${location.country}, and `;
		const suggestedRecipesString = suggestedRecipes
			? ''
			: `, that doesnt include these recipes, exclude:[${suggestedRecipes}]`;
		const query = `
      given ${locationString},
      the season based on this date:${new Date().toDateString()},
      suggest me a recipe very different from the following list ${suggestedRecipesString}.
      Try to add a lot of variety and detail but heavily bias towards in seasonal ingredients,
      name them without the season though and with the origin at the beginning, and adjectives about the taste.
      Only respond with one recipe name nothing else, in the form of "".
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
