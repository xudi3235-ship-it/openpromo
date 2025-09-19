package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Recover())

	e.GET("/", func(c echo.Context) error {
		message := os.Getenv("MESSAGE")
		if message == "" {
			message = "Hello from Echo"
		}
		envVars := os.Environ()
		instanceID := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")
		return c.JSON(http.StatusOK, map[string]string{
			"message":     message,
			"instance_id": instanceID,
			"env":		 fmt.Sprintf("%v", envVars),
		})
	})

	e.POST("/video/edit", handleVideoEdit)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e.Logger.Infof("starting server on :%s", port)
	if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
		e.Logger.Fatalf("server failed: %v", err)
	}
}

func handleVideoEdit(c echo.Context) error {
	// WIP
	start := c.FormValue("start")
	end := c.FormValue("end")
	if start == "" || end == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "start and end parameters are required",
		})
	}

	srcFile, err := readUploadedFile(c, "video")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}
	defer os.Remove(srcFile)

	outputFile := filepath.Join(os.TempDir(), fmt.Sprintf("clip-%d.mp4", time.Now().UnixNano()))
	defer os.Remove(outputFile)

	cmd := exec.Command(
		"ffmpeg",
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", srcFile,
		"-ss", start,
		"-to", end,
		"-c", "copy",
		outputFile,
	)

	if err := cmd.Run(); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("ffmpeg failed: %v", err),
		})
	}

	return c.Attachment(outputFile, "clip.mp4")
}

func readUploadedFile(c echo.Context, field string) (string, error) {
	fileHeader, err := c.FormFile(field)
	if err != nil {
		return "", fmt.Errorf("failed to read field %s: %w", field, err)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer file.Close()

	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("upload-%d%s", time.Now().UnixNano(), filepath.Ext(fileHeader.Filename)))
	out, err := os.Create(tmpFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return "", fmt.Errorf("failed to copy file: %w", err)
	}

	return tmpFile, nil
}
