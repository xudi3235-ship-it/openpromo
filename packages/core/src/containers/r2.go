package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	containersv1 "main/gen/containers/v1"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Common TTL presets for R2 uploads
const (
	TTL1Hour   = 1 * time.Hour
	TTL24Hours = 24 * time.Hour
	TTL1Week   = 7 * 24 * time.Hour
	TTL1Month  = 30 * 24 * time.Hour
)

// Known bucket names
const (
	BucketDefault   = "openpromo-bucket"
	BucketReference = "openpromo-reference"
	BucketPublic    = "public"
)

// getBucketName resolves proto enum to actual bucket name
func getBucketName(bucket containersv1.R2Bucket) string {
	switch bucket {
	case containersv1.R2Bucket_R2_BUCKET_REFERENCE:
		return BucketReference
	case containersv1.R2Bucket_R2_BUCKET_PUBLIC:
		return BucketPublic
	case containersv1.R2Bucket_R2_BUCKET_DEFAULT, containersv1.R2Bucket_R2_BUCKET_UNSPECIFIED:
		fallthrough
	default:
		return BucketDefault
	}
}

type r2Uploader struct {
	client   *s3.Client
	presign  *s3.PresignClient
	bucket   string
	endpoint string
}

func newR2Uploader(ctx context.Context) (*r2Uploader, error) {
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if accessKey == "" || secretKey == "" {
		return nil, errors.New("missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY for R2")
	}

	bucket := os.Getenv("R2_BUCKET")
	if bucket == "" {
		bucket = "openpromo-bucket"
	}

	// Endpoint resolution: prefer explicit R2_ENDPOINT, else derive from R2_ACCOUNT_ID, else fallback to the known hostname.
	endpoint := os.Getenv("R2_ENDPOINT")
	if endpoint == "" {
		if accountID := os.Getenv("R2_ACCOUNT_ID"); accountID != "" {
			endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
		} else {
			endpoint = "https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com"
		}
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if service == s3.ServiceID {
			return aws.Endpoint{
				URL:               endpoint,
				HostnameImmutable: true,
				SigningRegion:     "auto",
			}, nil
		}
		return aws.Endpoint{}, fmt.Errorf("unknown endpoint requested for service %s", service)
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &r2Uploader{
		client:   client,
		presign:  s3.NewPresignClient(client),
		bucket:   bucket,
		endpoint: endpoint,
	}, nil
}

// newR2UploaderForBucket creates an uploader for a specific bucket
func newR2UploaderForBucket(ctx context.Context, bucket containersv1.R2Bucket) (*r2Uploader, error) {
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if accessKey == "" || secretKey == "" {
		return nil, errors.New("missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY for R2")
	}

	bucketName := getBucketName(bucket)

	endpoint := os.Getenv("R2_ENDPOINT")
	if endpoint == "" {
		if accountID := os.Getenv("R2_ACCOUNT_ID"); accountID != "" {
			endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
		} else {
			endpoint = "https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com"
		}
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if service == s3.ServiceID {
			return aws.Endpoint{
				URL:               endpoint,
				HostnameImmutable: true,
				SigningRegion:     "auto",
			}, nil
		}
		return aws.Endpoint{}, fmt.Errorf("unknown endpoint requested for service %s", service)
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &r2Uploader{
		client:   client,
		presign:  s3.NewPresignClient(client),
		bucket:   bucketName,
		endpoint: endpoint,
	}, nil
}

type uploadResult struct {
	Key        string
	URL        string
	ContentLen int64
}

// uploadFile uploads a file to R2 and returns a presigned URL with the specified TTL.
// Common TTL presets: TTL1Hour, TTL24Hours, TTL1Week, TTL1Month
func (u *r2Uploader) uploadFile(ctx context.Context, filePath, key, contentType string, ttl time.Duration) (*uploadResult, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	defer file.Close()

	uploader := manager.NewUploader(u.client)
	_, err = uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
		ACL:         types.ObjectCannedACLPrivate,
	})
	if err != nil {
		return nil, fmt.Errorf("put object: %w", err)
	}

	// Presign a GET URL with configurable TTL.
	presigned, err := u.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(u.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return nil, fmt.Errorf("presign: %w", err)
	}

	return &uploadResult{
		Key:        key,
		URL:        presigned.URL,
		ContentLen: fileStatSize(file),
	}, nil
}

func fileStatSize(f *os.File) int64 {
	info, err := f.Stat()
	if err != nil {
		return 0
	}
	return info.Size()
}

func buildR2Key(filename string) string {
	// Store under ephemeral/hourly/<filename> to match Python convention.
	return filepath.Join("ephemeral", "hourly", filename)
}

func sanitizeURL(raw string) string {
	if raw == "" {
		return ""
	}
	if _, err := url.Parse(raw); err != nil {
		return ""
	}
	return raw
}
