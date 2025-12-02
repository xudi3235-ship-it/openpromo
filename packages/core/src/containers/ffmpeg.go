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
	outputPath  string
	contentType string
	filename    string
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
	// clean up temp dir
	defer os.RemoveAll(tempDir)

	// download inputs
	inputPaths := make([]string, len(inputURLs))
	for i, url := range inputURLs {
		inPath := filepath.Join(tempDir, fmt.Sprintf("in-%d", i))
		if err := downloadFile(ctx, url, inPath); err != nil {
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
	for _, token := range command {
		switch {
		case token == "{out}":
			args = append(args, outputPath)
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

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}

	return &ffmpegResult{
		outputPath:  outputPath,
		contentType: guessContentType(filename),
		filename:    filename,
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
