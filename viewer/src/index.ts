import { CompositeTilemap, settings } from "@pixi/tilemap";
import { Application, Assets, type FederatedPointerEvent } from "pixi.js";
import { Viewport } from "pixi-viewport";

// use32bitIndex is necessary to render more than 2^16 tiles (16k, 128*128),
// which is a bit small for what we're intending here.
settings.use32bitIndex = true;

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

// ConfigurationChangeEvent is sent whenever the configuration form is submited,
// wihtout actually checking for changes.
export class ConfigurationChangeEvent extends Event {
	static readonly type = "configuration-change";
	constructor(public readonly addr: string) {
		super(ConfigurationChangeEvent.type);
	}
}

export class WorldLoadedEvent extends Event {
	static readonly type = "world-loaded";
	constructor(public readonly world: World) {
		super(WorldLoadedEvent.type);
	}
}

type World = {
	Seed: number;
	Height: number;
	Width: number;
	Grid: Tile[];
	Weeds: Record<number, Weed>;
	Entities: Entity[];
};

type Tile = {
	Biome: Biome;
};

enum Biome {
	Plain = 0,
}

const biomeTilenames: Record<Biome, string> = {
	[Biome.Plain]: "plain.png",
};

type Weed = {};

type Entity = {
	ID: number;
	Type: EntityType;
	X: number;
	Y: number;
};

enum EntityType {
	Rattata = 0,
}

// bus is the main instance of TypedEventTarget used as decoupling method to
// avoid entangling the rest of the code.
const bus = new TypedEventTarget();

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
app.stage.eventMode = "static";

const viewport = new Viewport({
	events: app.renderer.events,
});
viewport.drag();
viewport.wheel();
viewport.clamp({ direction: "all" });
app.stage.addChild(viewport);

function bindState<T extends object>(initial: T, container: HTMLElement): T {
	return new Proxy(initial, {
		set(target, property, value) {
			if (target[property as keyof T] === value) {
				return true;
			}
			target[property as keyof T] = value;
			const el = container.querySelector(`[data-bind="${String(property)}"]`);
			if (el) {
				el.textContent = String(value);
			}
			return true;
		},
	});
}

const $nerdstats = document.getElementById(
	"nerdstats",
) as HTMLPreElement | null;
if (!$nerdstats) {
	throw new Error("nerdstats element not found");
}

type Nerdstats = {
	x: number;
	y: number;
	moving: boolean;
	tx: number;
	ty: number;
};
const nerdstats = bindState<Nerdstats>(
	{
		x: 0,
		y: 0,
		moving: false,
		tx: 0,
		ty: 0,
	},
	$nerdstats,
);

viewport.addEventListener("moved", (_ev: Event) => {
	nerdstats.x = Math.trunc(-viewport.x);
	nerdstats.y = Math.trunc(-viewport.y);
	nerdstats.moving = viewport.moving || false;
});

const TileSize = 32;

app.stage.addEventListener("pointermove", (ev: FederatedPointerEvent) => {
	const pos = viewport.toLocal(ev.global);
	nerdstats.tx = Math.floor(pos.x / TileSize);
	nerdstats.ty = Math.floor(pos.y / TileSize);
});

// initialize the assets
await Assets.init({ manifest: "/manifest.json" });

// $view is the PixiJS view handle.
const $view = document.getElementById("view") as HTMLDivElement | null;
if (!$view) {
	throw new Error("view element not found");
}
$view.appendChild(app.canvas);

bus.on(ConfigurationChangeEvent.type, async (ev: ConfigurationChangeEvent) => {
	fetch(`${ev.addr}/world`)
		.then((res) => res.json())
		.then((world: World) => {
			bus.emit(new WorldLoadedEvent(world));
		});
});

bus.on(WorldLoadedEvent.type, async (ev: WorldLoadedEvent) => {
	viewport.removeChildren();
	await Assets.loadBundle("default");

	const tilemap = new CompositeTilemap();

	for (let x = 0; x < ev.world.Width; x += 1) {
		for (let y = 0; y < ev.world.Height; y += 1) {
			const tx = x * TileSize;
			const ty = y * TileSize;
			const idx = index(ev.world, x, y);
			const tile = ev.world.Grid[idx];
			const tilename = biomeTilenames[tile.Biome];
			tilemap.tile(tilename, tx, ty);
			if (ev.world.Weeds[idx]) {
				tilemap.tile("weeds.png", tx, ty);
			}
		}
	}

	for (const entity of ev.world.Entities) {
		const tx = entity.X * TileSize;
		const ty = entity.Y * TileSize;
		tilemap.tile("rattata.png", tx, ty);
	}
	viewport.addChild(tilemap);
	viewport.moveCenter(0, 0);
});

function index(world: World, x: number, y: number): number {
	return y * world.Width + x;
}
