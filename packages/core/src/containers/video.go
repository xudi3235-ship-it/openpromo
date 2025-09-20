package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type VideoResizeRequest struct {
	VideoURL  string `json:"videoUrl"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}

func handleVideoResize(c echo.Context) error {
	var req VideoResizeRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON body",
		})
	}

	if req.VideoURL == "" || req.Width <= 0 || req.Height <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "videoUrl, width, and height are required",
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

	output, err := os.Open(outputFile)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to open processed video: %v", err),
		})
	}
	defer output.Close()

	info, err := output.Stat()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to read processed video metadata: %v", err),
		})
	}

	filename := fmt.Sprintf("resized-%d.mp4", time.Now().Unix())
	c.Response().Header().Set(echo.HeaderContentType, "video/mp4")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Response().Header().Set(echo.HeaderContentLength, strconv.FormatInt(info.Size(), 10))

	return c.Stream(http.StatusOK, "video/mp4", output)
}
