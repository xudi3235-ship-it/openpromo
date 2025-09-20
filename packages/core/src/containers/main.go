package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

var s3Client *S3Client

func main() {
	// Initialize S3 client
	var err error
	s3Client, err = NewS3Client()
	if err != nil {
		fmt.Printf("Failed to initialize S3 client: %v\n", err)
		os.Exit(1)
	}

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Recover())

	e.GET("/", func(c echo.Context) error {
		message := os.Getenv("MESSAGE")
		if message == "" {
			message = "Hello from Echo"
		}
		instanceID := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")
		return c.JSON(http.StatusOK, map[string]string{
			"message":     message,
			"instance_id": instanceID,
		})
	})

	e.POST("/video/resize", handleVideoResize)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e.Logger.Infof("starting server on :%s", port)
	if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
		e.Logger.Fatalf("server failed: %v", err)
	}
}
