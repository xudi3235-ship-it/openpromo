package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	containersv1 "main/gen/containers/v1"
)

type extractedFrame struct {
	timestamp  float32
	outputPath string
	width      uint32
	height     uint32
}

type framesResult struct {
	frames      []*extractedFrame
	contentType string
	workDir     string // caller must clean up
}

func extractFrames(ctx context.Context, req *containersv1.ExtractFramesRequest) (*framesResult, error) {
	if req.GetVideoUrl() == "" {
		return nil, fmt.Errorf("video_url is required")
	}

	// Create workspace
	workDir, err := os.MkdirTemp("", "frames-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}

	// Download video
	inputFile := filepath.Join(workDir, "input.mp4")
	if err := downloadFile(ctx, req.GetVideoUrl(), inputFile); err != nil {
		os.RemoveAll(workDir)
		return nil, fmt.Errorf("failed to download video: %w", err)
	}

	// Determine timestamps to extract
	timestamps := req.GetTimestamps()

	// If frame_count is set, probe video and calculate evenly distributed timestamps
	if req.FrameCount != nil && *req.FrameCount > 0 {
		probe, err := probeFile(ctx, inputFile)
		if err != nil {
			os.RemoveAll(workDir)
			return nil, fmt.Errorf("failed to probe video: %w", err)
		}
		durationSec := float32(probe.DurationMs) / 1000.0
		count := *req.FrameCount
		timestamps = make([]float32, count)
		for i := uint32(0); i < count; i++ {
			// Distribute evenly, avoiding very start/end
			timestamps[i] = (durationSec * (float32(i) + 0.5)) / float32(count)
		}
	}

	// Default: single frame at 0.5s
	if len(timestamps) == 0 {
		timestamps = []float32{0.5}
	}

	// Quality (ffmpeg -q:v, 1-31, lower is better)
	quality := uint32(2)
	if req.Quality != nil && *req.Quality >= 1 && *req.Quality <= 31 {
		quality = *req.Quality
	}

	// Extract each frame
	frames := make([]*extractedFrame, 0, len(timestamps))
	for i, ts := range timestamps {
		filename := fmt.Sprintf("frame_%d.jpg", i)
		if len(timestamps) == 1 && req.OutputFilename != nil && *req.OutputFilename != "" {
			filename = *req.OutputFilename
		}
		outputPath := filepath.Join(workDir, filename)

		cmd := exec.CommandContext(
			ctx,
			"ffmpeg",
			"-hide_banner",
			"-loglevel", "error",
			"-y",
			"-ss", fmt.Sprintf("%.3f", ts),
			"-i", inputFile,
			"-vframes", "1",
			"-q:v", fmt.Sprintf("%d", quality),
			outputPath,
		)

		if err := cmd.Run(); err != nil {
			os.RemoveAll(workDir)
			return nil, fmt.Errorf("ffmpeg frame extraction failed at %.2fs: %w", ts, err)
		}

		// Get dimensions via ffprobe (non-fatal if fails)
		probe, _ := probeFile(ctx, outputPath)
		width, height := uint32(0), uint32(0)
		if probe != nil {
			width, height = probe.Width, probe.Height
		}

		frames = append(frames, &extractedFrame{
			timestamp:  ts,
			outputPath: outputPath,
			width:      width,
			height:     height,
		})
	}

	return &framesResult{
		frames:      frames,
		contentType: "image/jpeg",
		workDir:     workDir,
	}, nil
}
