package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/labstack/echo/v4"
)

type VideoResizeRequest struct {
	VideoURL  string `json:"videoUrl"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	OutputKey string `json:"outputKey"`
}

func handleVideoResize(c echo.Context) error {
	var req VideoResizeRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON body",
		})
	}

	if req.VideoURL == "" || req.Width <= 0 || req.Height <= 0 || req.OutputKey == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "videoUrl, width, height, and outputKey are required",
		})
	}

	// Download video from URL to temp file
	inputFile := filepath.Join(os.TempDir(), fmt.Sprintf("input-%d.mp4", time.Now().UnixNano()))
	defer os.Remove(inputFile)

	if err := downloadFile(req.VideoURL, inputFile); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to download video: %v", err),
		})
	}

	// Process video with FFmpeg
	outputFile := filepath.Join(os.TempDir(), fmt.Sprintf("output-%d.mp4", time.Now().UnixNano()))
	defer os.Remove(outputFile)

	cmd := exec.Command(
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", inputFile,
		"-vf", fmt.Sprintf("scale=%d:%d", req.Width, req.Height),
		"-c:a", "copy",
		outputFile,
	)

	if err := cmd.Run(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("FFmpeg failed: %v", err),
		})
	}

	// Upload result to S3
	resultURL, err := s3Client.UploadFile(outputFile, req.OutputKey)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to upload result: %v", err),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status":    "success",
		"outputUrl": resultURL,
	})
}

