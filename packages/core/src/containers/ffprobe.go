package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

type probeResult struct {
	DurationMs uint64
	Width      uint32
	Height     uint32
	Format     string
	VideoCodec string
	FPS        float64
}

type ffprobeJSON struct {
	Format struct {
		Duration string `json:"duration"`
		FormatName string `json:"format_name"`
	} `json:"format"`
	Streams []struct {
		CodecType string `json:"codec_type"`
		CodecName string `json:"codec_name"`
		Width     uint32 `json:"width"`
		Height    uint32 `json:"height"`
		RFrameRate string `json:"r_frame_rate"`
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
		"-show_entries", "format=duration,format_name:stream=codec_type,codec_name,width,height,r_frame_rate",
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
	var videoCodec string
	var fps float64
	for _, s := range parsed.Streams {
		if s.CodecType == "video" {
			width = s.Width
			height = s.Height
			videoCodec = s.CodecName

			// Parse FPS from r_frame_rate (e.g., "30/1")
			if parts := strings.Split(s.RFrameRate, "/"); len(parts) == 2 {
				if num, err1 := strconv.ParseFloat(parts[0], 64); err1 == nil {
					if den, err2 := strconv.ParseFloat(parts[1], 64); err2 == nil && den > 0 {
						fps = num / den
					}
				}
			}
			break
		}
	}

	return &probeResult{
		DurationMs: durationMs,
		Width:      width,
		Height:     height,
		Format:     parsed.Format.FormatName,
		VideoCodec: videoCodec,
		FPS:        fps,
	}, nil
}

// probeFile probes a local file instead of a URL
func probeFile(ctx context.Context, filepath string) (*probeResult, error) {
	return probeMedia(ctx, filepath)
}
