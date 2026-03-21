package main

import (
	"image"
	"image/color"
	"image/jpeg"
	"log/slog"
	"math"
	"math/rand/v2"
	"os"

	"github.com/ojrac/opensimplex-go"
)

func main() {
	slog.Info("pocket-world-sim")

	var seed = NewSeed(rand.Uint64(), rand.Uint64(), 32)
	var world = NewWorld(seed)

	err := jpeg.Encode(os.Stdout, world.Render(), nil)
	if err != nil {
		slog.Error("rendering world", "err", err)
		return
	}

}

type Seed struct {
	Seed1, Seed2 uint64
	Size         int
}

func NewSeed(seed1, seed2 uint64, size int) Seed {
	return Seed{
		Seed1: seed1,
		Seed2: seed2,
		Size:  size,
	}
}

func (s Seed) Rand() *rand.Rand {
	return rand.New(rand.NewPCG(s.Seed1, s.Seed2))
}

type World struct {
	Seed Seed
	mat  []float64
}

func NewWorld(seed Seed) World {
	rand := seed.Rand()

	noise := opensimplex.NewNormalized(rand.Int64())

	mat := make([]float64, seed.Size*seed.Size)
	for x := range seed.Size {
		for y := range seed.Size {
			f := noise.Eval2(float64(x), float64(y))
			mat[x*seed.Size+y] = f
		}
	}

	return World{
		Seed: seed,
		mat:  mat,
	}
}

func (w World) At(x, y int) float64 {
	return w.mat[x*int(w.Seed.Size)+y]
}

func (w World) Render() image.Image {
	var grayscale = image.NewGray16(image.Rectangle{
		Min: image.Point{
			X: 0,
			Y: 0,
		},
		Max: image.Point{
			X: w.Seed.Size,
			Y: w.Seed.Size,
		},
	})
	for x := range w.Seed.Size {
		for y := range w.Seed.Size {
			f := w.At(x, y)
			v := uint16(f * float64(math.MaxUint16))
			grayscale.SetGray16(x, y, color.Gray16{Y: v})
		}
	}
	return grayscale
}
