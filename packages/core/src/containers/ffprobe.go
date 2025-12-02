package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
)

type probeResult struct {
	DurationMs uint64
	Width      uint32
	Height     uint32
	Format     string
}

type ffprobeJSON struct {
	Format struct {
		Duration string `json:"duration"`
		FormatName string `json:"format_name"`
	} `json:"format"`
	Streams []struct {
		CodecType string `json:"codec_type"`
		Width     uint32 `json:"width"`
		Height    uint32 `json:"height"`
	} `json:"streams"`
}

func probeMedia(ctx context.Context, url string) (*probeResult, error) {
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}

	cmd := exec.CommandContext(
		ctx,
		"ffprobe",
		"-v", "error",
		"-print_format", "json",
		"-show_entries", "format=duration,format_name:stream=codec_type,width,height",
		url,
	)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	var parsed ffprobeJSON
	if err := json.Unmarshal(out, &parsed); err != nil {
		return nil, fmt.Errorf("parse ffprobe output: %w", err)
	}

	var durationMs uint64
	if parsed.Format.Duration != "" {
		if seconds, err := strconv.ParseFloat(parsed.Format.Duration, 64); err == nil && seconds >= 0 {
			durationMs = uint64(seconds * 1000)
		}
	}

	var width, height uint32
	for _, s := range parsed.Streams {
		if s.CodecType == "video" {
			width = s.Width
			height = s.Height
			break
		}
	}

	return &probeResult{
		DurationMs: durationMs,
		Width:      width,
		Height:     height,
		Format:     parsed.Format.FormatName,
	}, nil
}
