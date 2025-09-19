package main

import (
	"fmt"
	"net/http"
	"os"

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
		instanceID := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")
		return c.String(
			http.StatusOK,
			fmt.Sprintf(
				"Hi, I'm a container and this is my message: %s, and my instance ID is: %s",
				message,
				instanceID,
			),
		)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e.Logger.Infof("starting server on :%s", port)
	if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
		e.Logger.Fatalf("server failed: %v", err)
	}
}
