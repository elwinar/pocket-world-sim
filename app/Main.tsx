import { type ChangeEvent, type SubmitEvent, useState } from "react";

export function Main() {
	const [addr, setAddr] = useState<string>("http://localhost:8765");
	// biome-ignore lint/suspicious/noExplicitAny: not used yet
	const [world, setWorld] = useState<any>({});

	function handleAddrChange(e: ChangeEvent<HTMLInputElement>) {
		setAddr(e.target.value);
	}

	function handleFormSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		fetchWorld(addr).then(setWorld);
		return false;
	}

	return (
		<>
			<h1>pocket world sim</h1>
			<form onSubmit={handleFormSubmit}>
				<input type="text" value={addr} onChange={handleAddrChange} />
				<button type="submit">load</button>
			</form>
			<pre>{JSON.stringify(world)}</pre>
		</>
	);
}

// biome-ignore lint/suspicious/noExplicitAny: no parsing of the payload yet
async function fetchWorld(addr: string): Promise<any> {
	return fetch(`${addr}/world`).then((res) => {
		if (!res.ok) {
			throw new Error("fetching world failed");
		}
		return res.json();
	});
}
