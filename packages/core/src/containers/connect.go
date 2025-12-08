package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	containersv1 "main/gen/containers/v1"
	containersv1connect "main/gen/containers/v1/containersv1connect"

	"connectrpc.com/connect"
)

type containerServiceServer struct{}

func (containerServiceServer) Ping(ctx context.Context, _ *connect.Request[containersv1.PingRequest]) (*connect.Response[containersv1.PingResponse], error) {
	message := os.Getenv("MESSAGE")
	if message == "" {
		message = "Hello from Connect RPC"
	}
	instanceID := os.Getenv("CLOUDFLARE_DEPLOYMENT_ID")

	resp := connect.NewResponse(&containersv1.PingResponse{
		Message:    message,
		InstanceId: instanceID,
	})

	return resp, nil
}

func (containerServiceServer) ResizeVideo(ctx context.Context, req *connect.Request[containersv1.ResizeVideoRequest]) (*connect.Response[containersv1.ResizeVideoResponse], error) {
	result, err := resizeVideo(ctx, req.Msg.GetVideoUrl(), int(req.Msg.GetWidth()), int(req.Msg.GetHeight()))
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("resize failed: %w", err))
	}

	uploader, err := newR2Uploader(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 init failed: %w", err))
	}

	key := buildR2Key(result.filename)
	uploadRes, err := uploader.uploadFile(ctx, result.outputPath, key, result.contentType, TTL1Hour)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 upload failed: %w", err))
	}
	// Best-effort cleanup of the temp output file now that it is uploaded.
	_ = os.Remove(result.outputPath)

	resp := connect.NewResponse(&containersv1.ResizeVideoResponse{
		ContentType: result.contentType,
		Filename:    result.filename,
		R2Url:       sanitizeURL(uploadRes.URL),
		R2Key:       uploadRes.Key,
	})

	return resp, nil
}

func (containerServiceServer) RunFfmpeg(ctx context.Context, req *connect.Request[containersv1.RunFfmpegRequest]) (*connect.Response[containersv1.RunFfmpegResponse], error) {
	result, err := runFfmpeg(ctx, req.Msg.GetInputUrls(), req.Msg.GetCommand(), req.Msg.GetOutputFilename())
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("ffmpeg failed: %w", err))
	}
	defer os.RemoveAll(result.workspaceDir)

	uploader, err := newR2Uploader(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 init failed: %w", err))
	}

	key := filepath.Join("ffmpeg", buildR2Key(result.filename))
	uploadRes, err := uploader.uploadFile(ctx, result.outputPath, key, result.contentType, TTL1Hour)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 upload failed: %w", err))
	}

	resp := connect.NewResponse(&containersv1.RunFfmpegResponse{
		R2Url:       sanitizeURL(uploadRes.URL),
		R2Key:       uploadRes.Key,
		ContentType: result.contentType,
		Filename:    result.filename,
	})
	return resp, nil
}

func (containerServiceServer) ProbeMedia(ctx context.Context, req *connect.Request[containersv1.ProbeMediaRequest]) (*connect.Response[containersv1.ProbeMediaResponse], error) {
	probe, err := probeMedia(ctx, req.Msg.GetUrl())
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("probe failed: %w", err))
	}

	resp := connect.NewResponse(&containersv1.ProbeMediaResponse{
		DurationMs: probe.DurationMs,
		Width:      probe.Width,
		Height:     probe.Height,
		Format:     probe.Format,
	})
	return resp, nil
}

func (containerServiceServer) TranscodeVideo(ctx context.Context, req *connect.Request[containersv1.TranscodeVideoRequest]) (*connect.Response[containersv1.TranscodeVideoResponse], error) {
	result, err := transcodeVideo(ctx, req.Msg.GetInputUrl(), req.Msg.GetPlatform())
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("transcode failed: %w", err))
	}

	uploader, err := newR2Uploader(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 init failed: %w", err))
	}

	key := buildR2Key(result.filename)
	uploadRes, err := uploader.uploadFile(ctx, result.outputPath, key, result.contentType, TTL1Hour)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("r2 upload failed: %w", err))
	}
	// Best-effort cleanup of the temp output file now that it is uploaded.
	_ = os.Remove(result.outputPath)

	resp := connect.NewResponse(&containersv1.TranscodeVideoResponse{
		OutputUrl:  sanitizeURL(uploadRes.URL),
		Transcoded: result.transcoded,
	})

	return resp, nil
}

func newConnectHandler() (string, http.Handler) {
	return containersv1connect.NewContainerServiceHandler(containerServiceServer{})
}
