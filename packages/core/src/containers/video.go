package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type videoResizeResult struct {
	outputPath  string
	contentType string
	filename    string
}

func resizeVideo(ctx context.Context, videoURL string, width, height int) (*videoResizeResult, error) {
	if videoURL == "" || width <= 0 || height <= 0 {
		return nil, fmt.Errorf("videoUrl, width, and height are required")
	}

	inputFile := filepath.Join(os.TempDir(), fmt.Sprintf("input-%d.mp4", time.Now().UnixNano()))
	defer os.Remove(inputFile)

	if err := downloadFile(ctx, videoURL, inputFile); err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}

	outputFile := filepath.Join(os.TempDir(), fmt.Sprintf("output-%d.mp4", time.Now().UnixNano()))

	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", inputFile,
		"-vf", fmt.Sprintf("scale=%d:%d", width, height),
		"-c:a", "copy",
		outputFile,
	)

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}

	return &videoResizeResult{
		outputPath:  outputFile,
		contentType: "video/mp4",
		filename:    fmt.Sprintf("resized-%d.mp4", time.Now().Unix()),
	}, nil
}
