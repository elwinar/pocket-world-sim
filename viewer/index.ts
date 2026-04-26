import { Application } from "pixi.js";

// TypedEventTarget is a barebones event bus implementation with typing for
// sanity.
class TypedEventTarget extends EventTarget {
	emit(event: Event): boolean {
		return super.dispatchEvent(event);
	}

	on<T extends Event>(
		eventType: string,
		listener: (event: T) => void,
	): () => void {
		const handler = listener as EventListener;
		super.addEventListener(eventType, handler);
		return () => super.removeEventListener(eventType, handler);
	}
}

// bus is the main instance of TypedEventTarget used as decoupling method to
// avoid entangling the rest of the code.
const bus = new TypedEventTarget();

// ConfigurationChangeEvent is sent whenever the configuration form is submited,
// wihtout actually checking for changes.
export class ConfigurationChangeEvent extends Event {
	static readonly type = "configuration-change";
	constructor(public readonly addr: string) {
		super(ConfigurationChangeEvent.type);
	}
}

// $cfg is the configuration form UI handle.
const $cfg = document.getElementById("cfg") as HTMLFormElement | null;
if (!$cfg) {
	throw new Error("cfg form not found");
}

// on submit of the cfg handle, parse the form values and emit the change
// event.
$cfg.addEventListener("submit", (ev: SubmitEvent) => {
	ev.preventDefault();

	const formData = new FormData(ev.currentTarget as HTMLFormElement);
	const addr = formData.get("addr") as string;
	if (!addr) {
		throw new Error("missing url");
	}
	bus.emit(new ConfigurationChangeEvent(addr));
});

// initialize the PixiJS application.
const app = new Application();
await app.init({
	backgroundColor: "#f0f0f0",
	resizeTo: window,
	resolution: window.devicePixelRatio || 1,
});

// $view is the PixiJS view handle.
const $view = document.getElementById("view") as HTMLDivElement | null;
if (!$view) {
	throw new Error("view element not found");
}
$view.appendChild(app.canvas);

bus.on(
	ConfigurationChangeEvent.type,
	async function handleConfigurationChange(event: ConfigurationChangeEvent) {
		console.log("changed configuration", event);
	},
);
