package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("healthz %s %s", r.Method, r.URL.Path)
		message := os.Getenv("MESSAGE")
		if message == "" {
			message = "Hello from Connect RPC container"
		}
		instanceID := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"message":     message,
			"instance_id": instanceID,
		})
	})

	connectPath, connectHandler := newConnectHandler()
	log.Printf("registering connect handler at %s", connectPath)
	// Path from connect-go ends with '/', so ServeMux will match all subpaths.
	mux.Handle(connectPath, loggingMiddleware(connectHandler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	log.Printf("starting server on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
