package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type burnSubtitleResult struct {
	outputPath  string
	contentType string
	filename    string
}

func burnSubtitle(ctx context.Context, videoURL string, assContent string) (*burnSubtitleResult, error) {
	if videoURL == "" {
		return nil, fmt.Errorf("video_url is required")
	}
	if assContent == "" {
		return nil, fmt.Errorf("ass_content is required")
	}

	// Create temp workspace
	tempDir, err := os.MkdirTemp("", "subtitle-work-")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Download input video
	inputFile := filepath.Join(tempDir, "input.mp4")
	if err := downloadFile(ctx, videoURL, inputFile); err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}

	// Write ASS content to file
	assFile := filepath.Join(tempDir, "subtitle.ass")
	if err := os.WriteFile(assFile, []byte(assContent), 0644); err != nil {
		return nil, fmt.Errorf("failed to write ass file: %w", err)
	}

	// Prepare output
	outputFile := filepath.Join(tempDir, fmt.Sprintf("output-%d.mp4", time.Now().UnixNano()))

	// Build ffmpeg command to burn subtitles
	// Using ass filter which handles ASS/SSA format with styling
	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", inputFile,
		"-vf", fmt.Sprintf("ass=%s", assFile),
		"-c:v", "libx264",
		"-preset", "fast",
		"-c:a", "copy",
		outputFile,
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}

	// Verify output exists
	info, err := os.Stat(outputFile)
	if err != nil {
		return nil, fmt.Errorf("output file missing: %w", err)
	}
	if info.Size() == 0 {
		return nil, fmt.Errorf("output file is empty")
	}

	// Move output to a location that persists after this function returns
	finalOutput := filepath.Join(os.TempDir(), fmt.Sprintf("subtitled-%d.mp4", time.Now().UnixNano()))
	if err := os.Rename(outputFile, finalOutput); err != nil {
		return nil, fmt.Errorf("failed to move output: %w", err)
	}

	return &burnSubtitleResult{
		outputPath:  finalOutput,
		contentType: "video/mp4",
		filename:    fmt.Sprintf("subtitled-%d.mp4", time.Now().Unix()),
	}, nil
}
