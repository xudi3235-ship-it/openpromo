package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ffmpegResult struct {
	outputPath   string
	contentType  string
	filename     string
	workspaceDir string
}

func runFfmpeg(ctx context.Context, inputURLs []string, command []string, outputFilename string) (*ffmpegResult, error) {
	if len(inputURLs) == 0 {
		return nil, fmt.Errorf("input_urls is required")
	}
	if len(command) == 0 {
		return nil, fmt.Errorf("command is required")
	}

	// temp workspace
	tempDir, err := os.MkdirTemp("", "ffmpeg-work-")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	// Cleanup helper for early returns. Caller handles cleanup on success.
	cleanup := func() {
		_ = os.RemoveAll(tempDir)
	}

	// download inputs
	inputPaths := make([]string, len(inputURLs))
	for i, url := range inputURLs {
		inPath := filepath.Join(tempDir, fmt.Sprintf("in-%d", i))
		if err := downloadFile(ctx, url, inPath); err != nil {
			cleanup()
			return nil, fmt.Errorf("download input %d: %w", i, err)
		}
		inputPaths[i] = inPath
	}

	// determine output
	filename := outputFilename
	if filename == "" {
		filename = fmt.Sprintf("ffmpeg-%d.mp4", time.Now().Unix())
	}
	outputPath := filepath.Join(tempDir, "out-"+filename)

	// substitute placeholders
	args := make([]string, 0, len(command)+2)
	args = append(args, "-y")
	outInjected := false
	for _, token := range command {
		switch {
		case token == "{out}":
			args = append(args, outputPath)
			outInjected = true
		case strings.HasPrefix(token, "{in"):
			// {in0}, {in1}, etc.
			idxStr := strings.TrimSuffix(strings.TrimPrefix(token, "{in"), "}")
			if idxStr == "" {
				return nil, fmt.Errorf("invalid input placeholder %q", token)
			}
			idx := 0
			_, err := fmt.Sscanf(idxStr, "%d", &idx)
			if err != nil || idx < 0 || idx >= len(inputPaths) {
				return nil, fmt.Errorf("input placeholder %q out of range", token)
			}
			args = append(args, inputPaths[idx])
		default:
			args = append(args, token)
		}
	}
	// If caller didn't supply an {out} placeholder, append output path automatically.
	if !outInjected {
		args = append(args, outputPath)
	}

	fmt.Printf("[containers.runFfmpeg] executing: ffmpeg %s\n", strings.Join(args, " "))

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		cleanup()
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}

	info, err := os.Stat(outputPath)
	if err != nil {
		cleanup()
		return nil, fmt.Errorf("ffmpeg output missing at %s: %w", outputPath, err)
	}
	if info.Size() == 0 {
		cleanup()
		return nil, fmt.Errorf("ffmpeg output empty at %s", outputPath)
	}

	return &ffmpegResult{
		outputPath:   outputPath,
		contentType:  guessContentType(filename),
		filename:     filename,
		workspaceDir: tempDir,
	}, nil
}

func guessContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	default:
		return "application/octet-stream"
	}
}
