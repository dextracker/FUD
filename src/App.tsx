/** @format */

import React, { useEffect, useState } from 'react';
import lottie from 'lottie-web';
import './App.css';
import openai, { OpenAI } from 'openai';
import CompletionRequest from 'openai';
import EngineName from 'openai';
import { CompletionChoice } from 'openai/resources';
import { OpenAIClient } from 'openai-fetch';
import ReactMarkdown from 'react-markdown';

const client = new OpenAIClient({
	apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

function App() {
	const [output, setOutput] = useState('');
	const [promptOutput, setPromptOutput] = useState('');
	const [placeholder, setPlaceholder] = useState('');

	const handleLoad = () => {
		lottie.loadAnimation({
			container: document.querySelector('#animation') as Element, // the dom element that will contain the animation
			renderer: 'svg',
			loop: false,
			autoplay: true,
			path: 'FUD_FRONT_PAGE_90_FPS.json', // the path to the animation json
		});
		getCleverTextPlaceholder();
	};

	const handleKeyDown = (e: { key: string }) => {
		if (e.key === 'Enter') {
			lottie.loadAnimation({
        name : "loading",
				container: document.querySelector('#loading') as Element, // the dom element that will contain the animation
				renderer: 'svg',
				loop: true,
				autoplay: true,
				path: 'FUD_LOADING_90_FPS.json', // the path to the animation json
			});
			talkToGPT();
		}
	};

	async function talkToGPT() {
		try {
			let response = await client.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content: 'You are a helpful assistant.',
					},
					{
						role: 'user',
						content: `${output} + " : NOTICE return everything in markdown to be rendered in html. only give me the recipe and nothing else`,
					},
				],
			});
			setPromptOutput(response.message.content!);
      lottie.destroy("loading")
		} catch (error) {
			console.error('Error:', error);
		}
	}

	async function getCleverTextPlaceholder() {
		console.log(process.env.REACT_APP_OPENAI_API_KEY);

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
						content: `You are an ai chef assitant that generates recipes. short, more catchy, less pretentious, act like a chef, no references to my friend or personhood, just direct 1st person language. return what you generate in a markdown format for a ReactMarkdown component. again say nothing else but the markdown`,
					},
				],
			});
			console.log('test');
			setPlaceholder(response.message.content!);

			console.log(response);
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
						onChange={(e) => {
							setOutput(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						className="text-input"
					/>
				</div>
				<>
						<div id="loading" style={{ width: '100%', height: '100%' }}></div>

					{promptOutput ? (
						<ReactMarkdown className="output-window">
							{promptOutput.toString()}
						</ReactMarkdown>
					) : (
						<></>
					)}
				</>
			</div>
		</div>
	);
}

export default App;
