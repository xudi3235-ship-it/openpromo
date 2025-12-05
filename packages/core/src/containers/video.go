package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	containersv1 "main/gen/containers/v1"
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

type videoTranscodeResult struct {
	outputPath  string
	contentType string
	filename    string
	transcoded  bool
}

func transcodeVideo(ctx context.Context, videoURL string, platform containersv1.Platform) (*videoTranscodeResult, error) {
	if videoURL == "" {
		return nil, fmt.Errorf("input_url is required")
	}

	inputFile := filepath.Join(os.TempDir(), fmt.Sprintf("input-%d.mp4", time.Now().UnixNano()))
	defer os.Remove(inputFile)

	if err := downloadFile(ctx, videoURL, inputFile); err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}

	// Get video metadata
	probe, err := probeFile(ctx, inputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to probe video: %w", err)
	}

	// Check if transcoding is needed
	needsTranscode, err := needsTranscoding(probe, platform)
	if err != nil {
		return nil, fmt.Errorf("failed to determine transcoding needs: %w", err)
	}

	if !needsTranscode {
		// No transcoding needed, just upload the original
		filename := fmt.Sprintf("video-%d.mp4", time.Now().Unix())
		return &videoTranscodeResult{
			outputPath:  inputFile,
			contentType: "video/mp4",
			filename:    filename,
			transcoded:  false,
		}, nil
	}

	outputFile := filepath.Join(os.TempDir(), fmt.Sprintf("output-%d.mp4", time.Now().UnixNano()))

	var cmd *exec.Cmd
	switch platform {
	case containersv1.Platform_PLATFORM_IG_REEL:
		cmd = buildIGReelCommand(ctx, inputFile, outputFile, probe)
	case containersv1.Platform_PLATFORM_FB_REEL:
		cmd = buildFBReelCommand(ctx, inputFile, outputFile, probe)
	case containersv1.Platform_PLATFORM_TIKTOK:
		// TikTok uses similar requirements to FB Reel
		cmd = buildFBReelCommand(ctx, inputFile, outputFile, probe)
	default:
		return nil, fmt.Errorf("unsupported platform: %v", platform)
	}

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}

	filename := fmt.Sprintf("transcoded-%d.mp4", time.Now().Unix())
	return &videoTranscodeResult{
		outputPath:  outputFile,
		contentType: "video/mp4",
		filename:    filename,
		transcoded:  true,
	}, nil
}

func needsTranscoding(probe *probeResult, platform containersv1.Platform) (bool, error) {
	switch platform {
	case containersv1.Platform_PLATFORM_IG_REEL:
		// IG Reel: max width 1080px, even dimensions required
		if probe.Width > 1080 {
			return true, nil
		}
		if probe.Width%2 != 0 || probe.Height%2 != 0 {
			return true, nil
		}
		// Check if codec is already H.264
		if probe.VideoCodec != "h264" {
			return true, nil
		}

	case containersv1.Platform_PLATFORM_FB_REEL, containersv1.Platform_PLATFORM_TIKTOK:
		// FB Reel/TikTok: fixed 9:16 aspect ratio, 3-90 seconds, 30fps
		if probe.DurationMs < 3000 || probe.DurationMs > 90000 {
			return false, fmt.Errorf("video duration %dms is not within 3-90 seconds range", probe.DurationMs)
		}
		// Check aspect ratio (should be close to 9:16)
		aspectRatio := float64(probe.Width) / float64(probe.Height)
		if aspectRatio < 0.5 || aspectRatio > 0.6 { // Allow some tolerance
			return true, nil
		}
		// Check resolution
		if probe.Width < 540 || probe.Height < 960 {
			return true, nil
		}
		// Check FPS
		if probe.FPS < 24 || probe.FPS > 60 {
			return true, nil
		}
		// Check codec
		if probe.VideoCodec != "h264" {
			return true, nil
		}
	}

	return false, nil
}

func buildIGReelCommand(ctx context.Context, inputFile, outputFile string, probe *probeResult) *exec.Cmd {
	// Calculate target height maintaining aspect ratio, max width 1080
	targetWidth := int(1080)
	if probe.Width <= uint32(1080) {
		targetWidth = int(probe.Width)
	}
	// Ensure even dimensions
	if targetWidth%2 != 0 {
		targetWidth--
	}

	scaleFilter := fmt.Sprintf("scale=%d:-2:flags=lanczos", targetWidth) // -2 maintains aspect ratio and ensures even height

	return exec.CommandContext(
		ctx,
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", inputFile,
		"-vf", scaleFilter,
		"-c:v", "libx264",
		"-profile:v", "high",
		"-level:v", "4.1",
		"-pix_fmt", "yuv420p",
		"-movflags", "+faststart",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ac", "2",
		outputFile,
	)
}

func buildFBReelCommand(ctx context.Context, inputFile, outputFile string, probe *probeResult) *exec.Cmd {
	// FB Reel: fixed 1080x1920, 30fps, padding to maintain aspect ratio
	vfFilter := fmt.Sprintf(
		"scale=1080:1920:force_original_aspect_ratio=decrease,"+
			"pad=1080:1920:(1080-iw)/2:(1920-ih)/2,"+
			"fps=30,"+
			"setsar=1",
	)

	return exec.CommandContext(
		ctx,
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", inputFile,
		"-vf", vfFilter,
		"-c:v", "libx264",
		"-preset", "medium",
		"-profile:v", "high",
		"-level:v", "4.1",
		"-pix_fmt", "yuv420p",
		"-movflags", "+faststart",
		"-vsync", "cfr",
		"-r", "30",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ac", "2",
		outputFile,
	)
}
