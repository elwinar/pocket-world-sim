package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"os"

	"github.com/ojrac/opensimplex-go"
)

func main() {
	logLevel := new(slog.LevelVar)
	logLevel.Set(slog.LevelDebug)
	logHandler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})
	logger := slog.New(logHandler)
	slog.SetDefault(logger)
	slog.Info("pocket-world-sim")

	var addr string
	var world World
	flag.Uint64Var(&world.Seed, "seed", 0, "seed for initializing the procedural generation (0 for random)")
	flag.UintVar(&world.Width, "width", 10, "width of the world map")
	flag.UintVar(&world.Height, "height", 10, "height of the world map")
	flag.StringVar(&addr, "addr", ":8765", "http server listen address")
	flag.Func("log", "log level", func(v string) error {
		return logLevel.UnmarshalText([]byte(v))
	})
	flag.Parse()
	slog.Info("world", "seed", world.Seed, "size", fmt.Sprintf("%dx%d", world.Width, world.Height))

	if world.Seed == 0 {
		world.Seed = rand.Uint64()
	}
	world.Generate()

	slog.Info("starting server", "addr", addr)
	mux := http.NewServeMux()
	mux.HandleFunc("/world", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(world)
	})
	srv := &http.Server{
		Addr:     addr,
		Handler:  mux,
		ErrorLog: slog.NewLogLogger(logHandler, slog.LevelError),
	}
	srv.ListenAndServe()
}

type World struct {
	Seed          uint64
	Width, Height uint

	Grid []Tile
}

func (w *World) Generate() {
	rng := rand.New(rand.NewPCG(w.Seed, w.Seed))
	gridSeed := rng.Int64()

	w.Grid = make([]Tile, w.Width*w.Height)
	noise := opensimplex.NewNormalized(gridSeed)
	scale := 1.0
	gain := 2.0
	lacunarity := 0.5
	octaves := 2
	for x := range w.Width {
		for y := range w.Height {
			nx := float64(x) * scale
			ny := float64(y) * scale
			z := FractalBrownianMotion(noise, nx, ny, octaves, gain, lacunarity)
			w.Grid[w.index(x, y)] = Tile{
				Biome: PickBiome(z),
			}
		}
	}
	slog.Debug("grid", "v", w.Grid)
}

func (w *World) index(x, y uint) uint {
	return y*w.Width + x
}

type Tile struct {
	Biome Biome
}

//go:generate go tool stringer -type=Biome
type Biome int

const (
	Plain Biome = iota
	Weeds
)

func PickBiome(z float64) Biome {
	if z < 0.5 {
		return Plain
	}
	return Weeds
}

// Fractal Brownian Motion for 2D coordinates. https://thebookofshaders.com/13/.
func FractalBrownianMotion(noise opensimplex.Noise, x, y float64, octaves int, gain, lacunarity float64) float64 {
	total := 0.0
	amplitude := 1.0
	frequency := 1.0
	maxValue := 0.0 // Used to normalize the final result

	for range octaves {
		// Evaluate the base noise at the current frequency.
		// OpenSimplex returns a value between -1.0 and 1.0
		n := noise.Eval2(x*frequency, y*frequency)

		// Add the noise to our total, scaled by the current amplitude
		total += n * amplitude

		// Accumulate maximum possible value to normalize later
		maxValue += amplitude

		// Prepare amplitude and frequency for the next octave
		amplitude *= gain
		frequency *= lacunarity
	}

	// Normalize the result to keep it bounded between 0 and 1.0
	return total / maxValue
}
